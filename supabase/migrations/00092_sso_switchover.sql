-- ============================================================================
-- Turning company sign-on on for the staff, and keeping a way back in.
--
-- Until now `login_method = 'sso'` has been a label. Nothing read it, so a
-- person marked as an SSO user could still sign in with their password. That
-- is fine while the provider is off and wrong the moment it is on: the point
-- of company sign-on is that leaving Google ends access to Pulse, and a live
-- password quietly undoes that.
--
-- THE DANGEROUS PART, said plainly.
--
-- Switching everybody to SSO and scrambling their passwords means that if
-- Google then fails — an expired secret, a wrong redirect URL, a consent
-- screen somebody edited — the entire company is locked out with no way in.
-- Not inconvenienced: locked out, on the day payroll is due.
--
-- So the switch always leaves at least one account able to sign in with a
-- password, and refuses to run if asked to leave none. That account is the
-- way back, and it should be a super admin whose password somebody actually
-- knows.
-- ============================================================================

-- ── Put one person on company sign-on ───────────────────────────────────

CREATE OR REPLACE FUNCTION set_login_method(p_profile UUID, p_method TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role app_role := get_user_role();
  v_org        UUID     := get_user_org_id();
  v_role       app_role;
  v_old        TEXT;
BEGIN
  IF v_actor_role <> 'super_admin' THEN
    RAISE EXCEPTION 'Only a super admin can change how somebody signs in.'
      USING ERRCODE = '42501';
  END IF;

  IF p_method NOT IN ('password', 'sso') THEN
    RAISE EXCEPTION 'Sign-in method must be password or sso.';
  END IF;

  SELECT role, login_method INTO v_role, v_old
  FROM profiles WHERE id = p_profile AND organization_id = v_org;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'That person is not in your organisation.' USING ERRCODE = '42501';
  END IF;

  -- A candidate has no company account, and an alumnus has lost theirs.
  -- Putting either on SSO locks them out of their own records.
  IF p_method = 'sso' AND v_role IN ('candidate', 'alumni') THEN
    RAISE EXCEPTION 'Candidates and alumni sign in with a password — they have no company account.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE profiles SET login_method = p_method WHERE id = p_profile;

  INSERT INTO identity_events
    (organization_id, profile_id, event, old_value, new_value, actor_profile_id, note)
  VALUES
    (v_org, p_profile, 'login_method_changed', v_old, p_method, auth.uid(),
     CASE WHEN p_method = 'sso'
          THEN 'Signs in with the company Google account from now on.'
          ELSE 'Back to a password. Their password must be set before they can get in.'
     END);

  RETURN true;
END $$;

COMMENT ON FUNCTION set_login_method(UUID, TEXT) IS
  'Move one person between a password and company sign-on. Super admin only, and never for a candidate or an alumnus.';

REVOKE ALL ON FUNCTION set_login_method(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_login_method(UUID, TEXT) TO authenticated;

-- ── Who would be switched, and who would be left a way in ───────────────
--
-- Asked before the switch, so nobody has to guess what it will do. The
-- function that performs it uses the same list.

CREATE OR REPLACE FUNCTION sso_switchover_preview()
RETURNS TABLE (
  profile_id    UUID,
  full_name     TEXT,
  role          TEXT,
  work_email    TEXT,
  will_switch   BOOLEAN,
  reason        TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    (p.first_name || ' ' || p.last_name)::TEXT,
    p.role::TEXT,
    p.sso_email,
    CASE
      WHEN p.role IN ('candidate', 'alumni') THEN false
      WHEN COALESCE(p.sso_email, '') = ''    THEN false
      WHEN p.login_method = 'sso'            THEN false
      ELSE true
    END,
    CASE
      WHEN p.role IN ('candidate', 'alumni')
        THEN 'Not staff — keeps a password'
      WHEN COALESCE(p.sso_email, '') = ''
        THEN 'No work address recorded — set one first, or they will be locked out'
      WHEN p.login_method = 'sso'
        THEN 'Already on company sign-on'
      ELSE 'Will be switched'
    END::TEXT
  FROM profiles p
  WHERE p.organization_id = get_user_org_id()
    AND COALESCE(p.is_active, true)
    AND get_user_role() = 'super_admin'
  ORDER BY (p.role IN ('candidate', 'alumni')), p.first_name;
$$;

COMMENT ON FUNCTION sso_switchover_preview() IS
  'What turning on company sign-on would do, before it does it. Flags anybody with no work address, who would otherwise be locked out.';

REVOKE ALL ON FUNCTION sso_switchover_preview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION sso_switchover_preview() TO authenticated;
