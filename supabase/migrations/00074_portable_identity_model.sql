-- ============================================================================
-- Phase 1 — the identity model, written so it survives the move to Azure.
--
-- Pulse is leaving Supabase within about three months and moving to Azure on
-- plain Postgres. So the rule about how a person signs in is recorded HERE, as
-- data and triggers, instead of being an emergent behaviour of whichever
-- authentication service happens to be underneath.
--
-- Everything in this file is ordinary Postgres and ports unchanged. The one
-- provider-specific act — actually changing the address an account signs in
-- with — stays behind a small adapter that gets rewritten once.
--
-- The journey, which was only half built:
--
--   candidate   personal email + password      (they have no work address yet)
--   employee    work address through Google    (the company account)
--   alumnus     personal email + password      (the work account is gone)
--
-- What was broken before this:
--
--   * QA-37 — conversion never changed the role, so a joiner stayed a
--     candidate. Fixed in the dialog already; moved here so it is one
--     server-side step rather than three browser calls that can half finish.
--   * QA-39 — an alumnus could not sign in at all. On exit the role became
--     `alumni`, which blocks Google by design, but somebody who joined through
--     Google never had a password, and their work address stops working the
--     day they leave. No link was ever issued. Everyone who left was locked
--     out, and the exit screen reported success.
-- ============================================================================

-- ── How this person signs in ────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS login_method TEXT NOT NULL DEFAULT 'password'
    CHECK (login_method IN ('password', 'sso')),
  ADD COLUMN IF NOT EXISTS sso_email TEXT;

COMMENT ON COLUMN profiles.login_method IS
  'How this person is meant to sign in. Intent, recorded in the database so it is not tied to one auth provider.';
COMMENT ON COLUMN profiles.sso_email IS
  'The company address used for single sign-on. Null before they join and after they leave.';

-- ── Is single sign-on actually available? ───────────────────────────────────
--
-- Recording that somebody should use SSO is useless, and dangerous, while the
-- provider is switched off — it would lock out the entire company. QA-38 found
-- exactly that state: the login screen offers Google and only email is
-- enabled. So intent and enforcement are kept apart. Flip this on the day the
-- provider works, not before.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS sso_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sso_domain TEXT;

COMMENT ON COLUMN organizations.sso_enabled IS
  'True once company sign-on genuinely works. Until then login_method is recorded but passwords keep working.';
COMMENT ON COLUMN organizations.sso_domain IS
  'The company email domain, e.g. augustinnovate.com. Used to check a work address looks right.';

-- ── What happened to this identity, and who did it ──────────────────────────

CREATE TABLE IF NOT EXISTS identity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event TEXT NOT NULL CHECK (event IN (
    'candidate_invited', 'became_employee', 'became_alumni',
    'login_email_changed', 'personal_email_changed', 'login_method_changed',
    'reactivation_link_issued'
  )),
  old_value TEXT,
  new_value TEXT,
  actor_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_identity_events_profile ON identity_events(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_identity_events_org ON identity_events(organization_id, created_at DESC);

COMMENT ON TABLE identity_events IS
  'Who changed somebody''s role, sign-in address or anchor email, and when. Changing an identity is sensitive enough to leave a trail.';

ALTER TABLE identity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_reads_identity_events" ON identity_events;
CREATE POLICY "hr_reads_identity_events" ON identity_events
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

DROP POLICY IF EXISTS "person_reads_own_identity_events" ON identity_events;
CREATE POLICY "person_reads_own_identity_events" ON identity_events
  FOR SELECT USING (profile_id = auth.uid());

-- Written only by the SECURITY DEFINER functions below, never from a browser.
REVOKE INSERT, UPDATE, DELETE ON identity_events FROM authenticated, anon;

-- ── Candidate becomes a member of staff ─────────────────────────────────────
--
-- One call, server side, instead of three browser calls that can half finish.
-- QA-37 happened because the browser did part of the job and reported the
-- whole of it.

CREATE OR REPLACE FUNCTION become_employee(p_profile UUID, p_work_email TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor      UUID := auth.uid();
  v_actor_role app_role;
  v_org        UUID;
  v_old_role   app_role;
  v_sso        BOOLEAN;
BEGIN
  SELECT role, organization_id INTO v_actor_role, v_org
  FROM profiles WHERE id = v_actor;

  -- A hiring manager converts their own hire, so they are on this list too.
  -- The only change it can make is candidate → employee, which takes reach
  -- away from nobody.
  IF v_actor_role IS NULL
     OR v_actor_role NOT IN ('super_admin', 'hr_admin', 'manager', 'leadership') THEN
    RAISE EXCEPTION 'You are not allowed to move somebody onto the staff.'
      USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_old_role
  FROM profiles WHERE id = p_profile AND organization_id = v_org;

  IF v_old_role IS NULL THEN
    RAISE EXCEPTION 'That person is not in your organisation.' USING ERRCODE = '42501';
  END IF;

  -- Only a candidate is promoted. Somebody rejoining who used to be a manager
  -- keeps the role they had; this must never be a quiet demotion.
  IF v_old_role <> 'candidate' THEN
    RETURN false;
  END IF;

  SELECT sso_enabled INTO v_sso FROM organizations WHERE id = v_org;

  UPDATE profiles
  SET role         = 'employee',
      sso_email    = NULLIF(btrim(p_work_email), ''),
      -- Intent is recorded either way. It only becomes the way they sign in
      -- once the provider is genuinely switched on, or the whole company
      -- would be locked out by a column.
      login_method = CASE WHEN COALESCE(v_sso, false) THEN 'sso' ELSE login_method END
  WHERE id = p_profile;

  INSERT INTO identity_events
    (organization_id, profile_id, event, old_value, new_value, actor_profile_id, note)
  VALUES
    (v_org, p_profile, 'became_employee', v_old_role::text, 'employee', v_actor,
     CASE WHEN COALESCE(v_sso, false)
          THEN 'Signs in with the company account from now on.'
          ELSE 'Company sign-on is not switched on yet, so the password still works.' END);

  RETURN true;
END $$;

COMMENT ON FUNCTION become_employee(UUID, TEXT) IS
  'QA-37: moves a candidate login onto the staff in one server-side step, and records who did it.';

REVOKE ALL ON FUNCTION become_employee(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION become_employee(UUID, TEXT) TO authenticated;

-- ── Member of staff becomes an alumnus ──────────────────────────────────────

CREATE OR REPLACE FUNCTION become_alumni(p_profile UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org      UUID;
  v_old_role app_role;
BEGIN
  SELECT role, organization_id INTO v_old_role, v_org
  FROM profiles WHERE id = p_profile;

  IF v_old_role IS NULL OR v_old_role = 'alumni' THEN
    RETURN false;
  END IF;

  -- Back to a password on their personal address. The work account stops
  -- working the day they leave, so single sign-on cannot be the way back in.
  UPDATE profiles
  SET role         = 'alumni',
      login_method = 'password',
      sso_email    = NULL,
      is_active    = true
  WHERE id = p_profile;

  INSERT INTO identity_events
    (organization_id, profile_id, event, old_value, new_value, actor_profile_id, note)
  VALUES
    (v_org, p_profile, 'became_alumni', v_old_role::text, 'alumni', auth.uid(),
     'Needs a reactivation link before they can sign in again.');

  RETURN true;
END $$;

COMMENT ON FUNCTION become_alumni(UUID) IS
  'QA-39: on exit, put the login back on a password against the personal address. A link still has to be issued before it works.';

REVOKE ALL ON FUNCTION become_alumni(UUID) FROM PUBLIC, anon;

-- ── The exit trigger now uses it ────────────────────────────────────────────
--
-- Before this the trigger set the role and stopped. That left somebody who
-- had joined through Google with no password, no working work address and no
-- link — locked out, while the exit screen said the exit was complete.

CREATE OR REPLACE FUNCTION relieve_employee_on_exit_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status  TEXT;
  v_profile UUID;
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  v_status := CASE NEW.exit_type
    WHEN 'termination'  THEN 'terminated'
    WHEN 'absconding'   THEN 'absconding'
    WHEN 'retirement'   THEN 'retired'
    ELSE 'resigned'   -- resignation, contract_end, mutual_separation
  END;

  UPDATE employees
  SET status = v_status,
      date_of_leaving = COALESCE(NEW.last_working_date, date_of_leaving, CURRENT_DATE)
  WHERE id = NEW.employee_id
  RETURNING profile_id INTO v_profile;

  IF v_profile IS NOT NULL THEN
    PERFORM become_alumni(v_profile);
  END IF;

  RETURN NEW;
END $$;

COMMENT ON FUNCTION relieve_employee_on_exit_completion() IS
  'When an exit is completed: set the employee status and leaving date, and put the login back on a password against their personal address.';

REVOKE ALL ON FUNCTION public.relieve_employee_on_exit_completion() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_relieve_on_exit_completion ON employee_exit_records;
CREATE TRIGGER trg_relieve_on_exit_completion
  AFTER UPDATE OF status ON employee_exit_records
  FOR EACH ROW EXECUTE FUNCTION relieve_employee_on_exit_completion();

-- ── Backfill ────────────────────────────────────────────────────────────────
-- Everyone currently signs in with a password, because that is the only
-- provider switched on. Existing staff get their work address recorded so the
-- switch is a flag flip rather than a data migration on the day.

UPDATE profiles p
SET sso_email = e.email
FROM employees e
WHERE e.profile_id = p.id
  AND p.sso_email IS NULL
  AND p.role NOT IN ('candidate', 'alumni')
  AND e.email IS NOT NULL
  AND e.email <> '';
