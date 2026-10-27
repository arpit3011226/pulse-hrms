-- ============================================================================
-- QA-36 (P0) — any employee could make themselves a super admin.
--
-- profiles carries the role, the organisation and the active flag. Row-level
-- security decides WHICH ROWS a person may update; it cannot decide WHICH
-- COLUMNS. The policy said:
--
--     users_update_own_profile  FOR UPDATE
--       USING (id = auth.uid())  WITH CHECK (id = auth.uid())
--
-- Both halves are satisfied by a person editing their own row, and `role` is
-- on their own row. The grant allowed it too: has_column_privilege(
-- 'authenticated', 'profiles', 'role', 'UPDATE') returned true.
--
-- Demonstrated against this database as the demo employee, inside a
-- transaction that was then rolled back:
--
--   set local role authenticated;
--   select set_config('request.jwt.claims',
--                     '{"sub":"<employee profile>","role":"authenticated"}', true);
--   update profiles set role = 'super_admin' where id = '<employee profile>';
--   -- → role_now = super_admin
--
-- One PATCH to /rest/v1/profiles from any signed-in employee, and they hold
-- every payslip, every exit record and every salary in the company. The same
-- hole lets them move organization_id and switch is_active back on after being
-- disabled.
--
-- RLS cannot express "this column is off limits", and a column grant cannot
-- either: HR and the employee share the one `authenticated` database role, so
-- revoking the column from authenticated would block HR as well. A trigger is
-- the right tool — it sees the old row and the new one and can judge the
-- change rather than the row.
-- ============================================================================

-- ── Is this organisation already occupied? ──────────────────────────────────
--
-- This has to bypass row-level security, and the reason is worth recording.
--
-- The guard below first asked this question inline, as the signed-in user. A
-- fresh sign-up has no organisation, so get_user_org_id() returns null, so
-- users_read_own_org_profiles showed them nothing but their own row — and the
-- check "does anybody else belong to this organisation?" came back NO for a
-- company with a hundred people in it. The guard then waved them in as its
-- super admin. RLS had quietly answered a security question with a lie.
--
-- Asking through a SECURITY DEFINER function gets the true answer.

CREATE OR REPLACE FUNCTION org_has_other_members(p_org UUID, p_except UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE organization_id = p_org
      AND id <> p_except
  );
$$;

COMMENT ON FUNCTION org_has_other_members(UUID, UUID) IS
  'QA-36: true when an organisation already has members. Bypasses RLS on purpose — the caller may not be allowed to see those members, and the answer must still be true.';

REVOKE ALL ON FUNCTION org_has_other_members(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION org_has_other_members(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION guard_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_caller_role app_role;
BEGIN
  -- The ordinary case: somebody edited their name or their avatar. Nothing
  -- privileged moved, so there is nothing to judge.
  IF  NEW.role            IS NOT DISTINCT FROM OLD.role
  AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id
  AND NEW.is_active       IS NOT DISTINCT FROM OLD.is_active
  AND NEW.email           IS NOT DISTINCT FROM OLD.email
  AND NEW.personal_email  IS NOT DISTINCT FROM OLD.personal_email
  THEN
    RETURN NEW;
  END IF;

  -- Trusted contexts.
  --
  -- Inside a SECURITY DEFINER function current_user becomes the function
  -- owner, so this is how relieve_employee_on_exit_completion() and
  -- mark_as_alumni() legitimately move somebody to the alumni role — those
  -- functions already check their own caller. service_role is the edge
  -- functions, which run with the service key and no JWT.
  IF current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  -- First person into a brand new organisation: the company-setup screen.
  --
  -- A fresh sign-up has no organisation yet. They create one and make
  -- themselves its super admin, which is the whole point of that screen.
  -- Narrowed to an organisation nobody else has joined, so this cannot be
  -- used to walk into an existing company as its administrator.
  IF  OLD.organization_id IS NULL
  AND NEW.organization_id IS NOT NULL
  AND NOT org_has_other_members(NEW.organization_id, NEW.id)
  THEN
    RETURN NEW;
  END IF;

  v_caller_role := get_user_role();
  IF v_caller_role IN ('super_admin', 'hr_admin') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Changing the role, organisation, active state or email addresses on a profile is not allowed from this account.'
    USING ERRCODE = '42501';
END $$;

COMMENT ON FUNCTION guard_profile_privileged_columns() IS
  'QA-36: row-level security cannot protect a column. Blocks self-service changes to role, organization_id, is_active and the two email addresses.';

DROP TRIGGER IF EXISTS trg_guard_profile_privileged_columns ON profiles;
CREATE TRIGGER trg_guard_profile_privileged_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION guard_profile_privileged_columns();
