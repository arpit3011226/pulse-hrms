-- ============================================================================
-- The QA-36 guard has to cover the two columns 00074 just added.
--
-- login_method and sso_email decide how somebody gets in. Left unguarded,
-- an employee could set their own login_method back to 'password' and walk
-- around company sign-on the day it is switched on, or point sso_email at a
-- colleague's work address.
--
-- The guard in 00073 lists the columns it protects explicitly, so a new
-- privileged column is invisible to it until it is named here. That is worth
-- saying out loud: anyone adding a column to `profiles` that affects access
-- must add it to this list, or it is unprotected the moment it exists.
-- ============================================================================

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
  AND NEW.login_method    IS NOT DISTINCT FROM OLD.login_method
  AND NEW.sso_email       IS NOT DISTINCT FROM OLD.sso_email
  THEN
    RETURN NEW;
  END IF;

  -- Trusted contexts.
  --
  -- Inside a SECURITY DEFINER function current_user becomes the function
  -- owner, so this is how become_employee(), become_alumni() and the exit
  -- trigger legitimately move somebody — those functions check their own
  -- caller. service_role is the edge functions, which run with the service
  -- key and no JWT.
  IF current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  -- First person into a brand new organisation: the company-setup screen.
  --
  -- Narrowed to an organisation nobody else has joined. org_has_other_members
  -- is SECURITY DEFINER on purpose — asked inline, row-level security hid the
  -- existing staff from a caller who had no organisation yet, and the answer
  -- came back "empty" for a company full of people.
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
    'Changing the role, organisation, active state, email addresses or sign-in method on a profile is not allowed from this account.'
    USING ERRCODE = '42501';
END $$;

COMMENT ON FUNCTION guard_profile_privileged_columns() IS
  'QA-36: row-level security cannot protect a column. Blocks self-service changes to role, organization_id, is_active, both email addresses, login_method and sso_email.';
