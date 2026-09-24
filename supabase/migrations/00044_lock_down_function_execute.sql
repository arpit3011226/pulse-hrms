-- Close the EXECUTE grants on our SECURITY DEFINER functions.
--
-- Postgres grants EXECUTE on a new function to PUBLIC, and Supabase additionally
-- grants it to anon and authenticated. Adding "GRANT EXECUTE ... TO authenticated"
-- in the earlier migrations did not take anything away, so every one of these was
-- reachable over /rest/v1/rpc with nothing but the anon key — and the anon key
-- ships inside the front-end bundle, so it is public.
--
-- Verified before this migration: an unauthenticated POST to
-- /rest/v1/rpc/mark_as_alumni returned 204, meaning anyone could demote an
-- employee's login to the alumni role and strip their access. A POST to
-- find_profile_by_personal_email answered whether an address has an account.
--
-- Trigger functions are revoked from everyone. A trigger fires as part of the
-- statement and does not test EXECUTE at that point, so they keep working.

-- ── 1. Take away the blanket grants ─────────────────────────────────────────

REVOKE ALL ON FUNCTION public.find_profile_by_personal_email(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_delegated_manager_ids()          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_outstanding_assets(UUID)         FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_person_context()                 FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_org_id()                    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_role()                      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_leadership_employee(UUID)         FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.manages_employee(UUID)               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_as_alumni(UUID)                 FROM PUBLIC, anon;

-- Trigger and internal functions: nobody calls these over the API.
REVOKE ALL ON FUNCTION public.handle_new_user()    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_audit()       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_asset_status()  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable()    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at()  FROM PUBLIC, anon, authenticated;

-- ── 2. Give back only what the signed-in app needs ──────────────────────────

GRANT EXECUTE ON FUNCTION public.find_profile_by_personal_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_delegated_manager_ids()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_outstanding_assets(UUID)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_person_context()                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_org_id()                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role()                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_leadership_employee(UUID)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.manages_employee(UUID)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_as_alumni(UUID)                 TO authenticated;

-- ── 3. Pin search_path on the three that were missing it ───────────────────
-- Without this, a SECURITY DEFINER function can be pointed at objects the
-- caller controls.

ALTER FUNCTION public.get_user_org_id()   SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_role()     SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_temp;

-- ── 4. mark_as_alumni checks its caller ────────────────────────────────────
-- Grants alone are one lock. This is the second: only HR, an admin or
-- leadership in the same organisation may move someone to the alumni role.

CREATE OR REPLACE FUNCTION mark_as_alumni(p_employee_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile UUID;
  v_emp_org UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  SELECT profile_id, organization_id INTO v_profile, v_emp_org
  FROM employees WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_emp_org IS DISTINCT FROM get_user_org_id() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF get_user_role() NOT IN ('super_admin', 'hr_admin', 'leadership') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF v_profile IS NULL THEN
    RETURN;   -- never had a login; nothing to keep alive
  END IF;

  UPDATE profiles
  SET role = 'alumni',
      is_active = true          -- they keep the login, with far less reach
  WHERE id = v_profile;
END $$;

REVOKE ALL ON FUNCTION public.mark_as_alumni(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_as_alumni(UUID) TO authenticated;

COMMENT ON FUNCTION mark_as_alumni(UUID) IS
  'F39: on exit, move the login to the alumni role. Callable only by HR, an admin or leadership in the same organisation.';
