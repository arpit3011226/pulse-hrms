-- ============================================================================
-- When did this application actually close?
--
-- 00080 keyed the retention clock off candidate_applications.updated_at,
-- which was wrong. A trigger resets updated_at on every edit, so opening a
-- rejected application eighteen months later to correct a typo restarted the
-- clock and the candidate's PAN card was kept for another six months.
--
-- It fails in the dangerous direction. Under the DPDP Act holding personal
-- data past its purpose is the breach; deleting a little early is an
-- inconvenience. A clock that silently extends itself is the wrong default.
--
-- So the closing date is recorded once, when the status first becomes
-- rejected or withdrawn, and is not moved by later edits. Reopening an
-- application clears it, because somebody back in the running is not someone
-- whose documents should be erased.
-- ============================================================================

ALTER TABLE candidate_applications
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

COMMENT ON COLUMN candidate_applications.closed_at IS
  'When this application was first rejected or withdrawn. Set once and not moved by later edits — the data retention clock runs from here.';

CREATE OR REPLACE FUNCTION stamp_application_closed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('rejected', 'withdrawn') THEN
    -- Set once. A second rejection does not restart the clock.
    IF NEW.closed_at IS NULL THEN
      NEW.closed_at := now();
    END IF;
  ELSE
    -- Back in the running, so there is nothing to erase.
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stamp_application_closed_at ON candidate_applications;
CREATE TRIGGER trg_stamp_application_closed_at
  BEFORE INSERT OR UPDATE OF status ON candidate_applications
  FOR EACH ROW EXECUTE FUNCTION stamp_application_closed_at();

-- Backfill. updated_at is the best guess we have for applications that
-- closed before this column existed, and it is better than treating them all
-- as closing today — which would hold every one of them for a further six
-- months.
UPDATE candidate_applications
SET closed_at = updated_at
WHERE closed_at IS NULL
  AND status IN ('rejected', 'withdrawn');

-- ── The purge list now reads the right date ─────────────────────────────────

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
    -- Finished with us only when EVERY application is closed. One live
    -- application anywhere keeps all of their documents.
    SELECT
      c.id,
      (c.first_name || ' ' || c.last_name) AS name,
      max(a.closed_at)::date AS last_closed
    FROM candidates c
    JOIN candidate_applications a ON a.candidate_id = c.id
    WHERE c.organization_id = p_org
    GROUP BY c.id, c.first_name, c.last_name
    HAVING bool_and(a.status IN ('rejected', 'withdrawn'))
       AND bool_and(a.closed_at IS NOT NULL)
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

REVOKE ALL ON FUNCTION candidate_documents_due_for_purge(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION candidate_documents_due_for_purge(UUID) TO authenticated;
