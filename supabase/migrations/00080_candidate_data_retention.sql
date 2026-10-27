-- ============================================================================
-- Deleting the documents of people we did not hire.
--
-- Under the DPDP Act 2023 personal data must be erased once the purpose it
-- was collected for has been served. A PAN card and an Aadhaar copy collected
-- to assess somebody we then turned down have served their purpose the moment
-- the application closes. Keeping them is not caution, it is exposure — and
-- QA-19 already showed what exposure looks like here.
--
-- The Rules were notified on 13 November 2025 and the main obligations apply
-- from 13 May 2027. Far cheaper to build the deletion now than to retrofit it
-- into a document store later.
--
-- DELIBERATELY NOT AUTOMATIC.
--
-- Pulse has no server and no scheduler it can rely on across the move to
-- Azure, and a purge that runs itself in a system nobody is watching is how
-- you lose documents you needed. So this reports what is due and HR presses
-- the button. The obligation is visible rather than silent, which is also
-- easier to evidence to a regulator than a cron job nobody can describe.
--
-- Erasing the files themselves cannot happen in SQL: storage blocks direct
-- deletes to avoid orphaned objects. So this function reports WHAT should go
-- and the application removes the files and then the rows.
-- ============================================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS candidate_data_retention_days INTEGER NOT NULL DEFAULT 180;

COMMENT ON COLUMN organizations.candidate_data_retention_days IS
  'How long documents from candidates who were not hired are kept after their last application closed. DPDP: erase once the purpose is served.';

CREATE OR REPLACE FUNCTION candidate_documents_due_for_purge(p_org UUID)
RETURNS TABLE (
  candidate_id    UUID,
  candidate_name  TEXT,
  closed_on       DATE,
  days_held       INTEGER,
  document_count  BIGINT,
  storage_paths   TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH retention AS (
    SELECT COALESCE(candidate_data_retention_days, 180) AS days
    FROM organizations WHERE id = p_org
  ),
  closed AS (
    -- Somebody is finished with us when every application they have is
    -- rejected or withdrawn. One live application anywhere keeps everything.
    SELECT
      c.id,
      (c.first_name || ' ' || c.last_name) AS name,
      max(a.updated_at)::date AS last_closed
    FROM candidates c
    JOIN candidate_applications a ON a.candidate_id = c.id
    WHERE c.organization_id = p_org
    GROUP BY c.id, c.first_name, c.last_name
    HAVING bool_and(a.status IN ('rejected', 'withdrawn'))
  )
  SELECT
    cl.id,
    cl.name,
    cl.last_closed,
    (CURRENT_DATE - cl.last_closed)::integer,
    count(i.id),
    array_remove(array_agg(i.storage_path), NULL)
  FROM closed cl
  CROSS JOIN retention r
  JOIN preboarding_checklists ch ON ch.candidate_id = cl.id
  JOIN preboarding_checklist_items i ON i.checklist_id = ch.id
  WHERE i.storage_path IS NOT NULL
    AND CURRENT_DATE - cl.last_closed > r.days
  GROUP BY cl.id, cl.name, cl.last_closed
  ORDER BY cl.last_closed;
$$;

COMMENT ON FUNCTION candidate_documents_due_for_purge(UUID) IS
  'Candidates who were not hired and whose documents are past the retention period. Reports only — the files are removed through the storage API, then the rows.';

REVOKE ALL ON FUNCTION candidate_documents_due_for_purge(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION candidate_documents_due_for_purge(UUID) TO authenticated;

-- ── Forgetting the rows ─────────────────────────────────────────────────────
--
-- Called after the files are gone. Clears the file details but keeps the row
-- and its label, so the record still shows that a PAN card was once asked for
-- and provided — which is itself worth being able to show — without holding
-- the document.

CREATE OR REPLACE FUNCTION purge_candidate_documents(p_candidate UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_org  UUID;
  v_n    INTEGER;
BEGIN
  SELECT role, organization_id INTO v_role, v_org FROM profiles WHERE id = auth.uid();
  IF v_role NOT IN ('super_admin', 'hr_admin') THEN
    RAISE EXCEPTION 'Only HR or a super admin may erase candidate documents.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM candidates WHERE id = p_candidate AND organization_id = v_org) THEN
    RAISE EXCEPTION 'That candidate is not in your organisation.' USING ERRCODE = '42501';
  END IF;

  UPDATE preboarding_checklist_items i
  SET storage_bucket = NULL,
      storage_path   = NULL,
      file_name      = NULL,
      file_size      = NULL,
      mime_type      = NULL,
      status         = 'pending',
      rejection_reason = 'Erased under the data retention policy.'
  FROM preboarding_checklists c
  WHERE i.checklist_id = c.id
    AND c.candidate_id = p_candidate
    AND i.storage_path IS NOT NULL;

  GET DIAGNOSTICS v_n = ROW_COUNT;

  INSERT INTO identity_events (organization_id, profile_id, event, new_value, actor_profile_id, note)
  SELECT v_org, p.id, 'personal_email_changed', NULL, auth.uid(),
         'Candidate documents erased under the retention policy (' || v_n || ' files).'
  FROM candidates c
  JOIN profiles p ON p.id = c.profile_id
  WHERE c.id = p_candidate AND c.profile_id IS NOT NULL;

  RETURN v_n;
END $$;

COMMENT ON FUNCTION purge_candidate_documents(UUID) IS
  'Clears the stored file details after the files themselves have been removed. Keeps the row so the record still shows what was asked for and provided.';

REVOKE ALL ON FUNCTION purge_candidate_documents(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION purge_candidate_documents(UUID) TO authenticated;
