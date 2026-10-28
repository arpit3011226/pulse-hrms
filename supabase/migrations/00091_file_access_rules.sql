-- ============================================================================
-- Who may touch which file — in one place, in the database.
--
-- Storage moves from Supabase Storage to Azure Blob. The rules about who may
-- read, write and delete a file were row-level security policies on
-- storage.objects: twelve of them across three buckets, written in 00036 and
-- 00076. Azure Blob has no row-level security, so something has to carry
-- them.
--
-- The obvious thing is to rewrite them in the function that talks to Blob.
-- That would put the access rules in TypeScript, where none of the existing
-- checks can reach them, and would leave two copies to drift — the policies
-- for as long as Supabase Storage is around, and the new ones.
--
-- So they live here instead. The function that talks to Blob asks this
-- question and does as it is told. One source of truth, written in the same
-- language as every other rule in this project, reachable by the same guard
-- scripts, and it ports to Azure with the rest of the database.
--
-- PATHS, because they differ by bucket and this is easy to get wrong:
--
--   employee-documents     <employee_id>/…        folder 1 is the owner
--   candidate-documents    <candidate_id>/…       folder 1 is the owner
--   reimbursement-receipts <org_id>/<employee_id>/…  folder 2 is the owner
-- ============================================================================

CREATE OR REPLACE FUNCTION can_access_file(
  p_bucket TEXT,
  p_path   TEXT,
  p_intent TEXT          -- 'read' | 'write' | 'delete'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role  app_role := get_user_role();
  v_parts TEXT[]   := string_to_array(COALESCE(p_path, ''), '/');
  v_owner TEXT;
BEGIN
  IF v_role IS NULL OR p_bucket IS NULL OR COALESCE(p_path, '') = '' THEN
    RETURN false;
  END IF;

  IF p_intent NOT IN ('read', 'write', 'delete') THEN
    RETURN false;
  END IF;

  -- A path must not be able to climb out of its own folder. Blob treats the
  -- key as opaque text, so ".." means nothing to it — but it would mean
  -- something to the owner check below if the first segment were empty.
  IF p_path LIKE '%..%' OR p_path LIKE '/%' OR array_length(v_parts, 1) < 2 THEN
    RETURN false;
  END IF;

  -- ── employee-documents ────────────────────────────────────────────────
  IF p_bucket = 'employee-documents' THEN
    v_owner := v_parts[1];

    IF p_intent = 'delete' THEN
      -- Deleting somebody's identity document is HR's, not self-service.
      RETURN v_role IN ('super_admin', 'hr_admin');
    END IF;

    RETURN EXISTS (
      SELECT 1 FROM employees
      WHERE id::text = v_owner AND profile_id = auth.uid()
    ) OR v_role IN ('super_admin', 'hr_admin', 'leadership');

  -- ── candidate-documents ───────────────────────────────────────────────
  ELSIF p_bucket = 'candidate-documents' THEN
    v_owner := v_parts[1];

    IF p_intent = 'delete' THEN
      RETURN v_role IN ('super_admin', 'hr_admin');
    END IF;

    IF p_intent = 'read' THEN
      RETURN EXISTS (
        SELECT 1 FROM candidates
        WHERE id::text = v_owner AND profile_id = auth.uid()
      ) OR v_role IN ('super_admin', 'hr_admin', 'manager', 'leadership');
    END IF;

    -- Writing is narrower than reading: the hiring panel may look, but only
    -- the candidate and HR may put something there.
    RETURN EXISTS (
      SELECT 1 FROM candidates
      WHERE id::text = v_owner AND profile_id = auth.uid()
    ) OR v_role IN ('super_admin', 'hr_admin');

  -- ── reimbursement-receipts ────────────────────────────────────────────
  ELSIF p_bucket = 'reimbursement-receipts' THEN
    -- Owner is the SECOND folder here. The organisation comes first.
    IF array_length(v_parts, 1) < 3 THEN
      RETURN false;
    END IF;
    v_owner := v_parts[2];

    RETURN EXISTS (
      SELECT 1 FROM employees
      WHERE id::text = v_owner AND profile_id = auth.uid()
    ) OR v_role IN ('super_admin', 'hr_admin', 'payroll_admin', 'leadership', 'manager');
  END IF;

  -- An unknown bucket is not an open one.
  RETURN false;
END $$;

COMMENT ON FUNCTION can_access_file(TEXT, TEXT, TEXT) IS
  'The file access rules from 00036 and 00076, in one place, so the Azure Blob adapter can ask rather than reimplement them.';

REVOKE ALL ON FUNCTION can_access_file(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION can_access_file(TEXT, TEXT, TEXT) TO authenticated;
