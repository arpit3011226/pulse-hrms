-- ============================================================================
-- QA-44 (P1) — a candidate could read every profile in the company.
--
-- 00053 hid the employee directory and the open requisitions from candidates
-- and alumni. It missed `profiles`, which carries name, email address and
-- role for everybody:
--
--   as the demo candidate:  select email, role from profiles  → 19 rows
--   including:              role: super_admin, @augustinnovate.com
--
-- So anybody given a candidate login — which HR hands out freely, to people
-- who have not been hired and may never be — could enumerate the whole staff
-- list and, more to the point, learn exactly which address holds the super
-- admin account. That is a ready-made target list for a phishing attempt,
-- handed over at the application stage.
--
-- Reading your OWN profile has to keep working: the app fetches it on every
-- sign-in to know who you are.
-- ============================================================================

DROP POLICY IF EXISTS "users_read_own_org_profiles" ON profiles;

CREATE POLICY "users_read_own_org_profiles" ON profiles
  FOR SELECT USING (
    -- Always yourself. Sign-in depends on it.
    id = auth.uid()
    -- Colleagues, but only if you are actually a colleague. A candidate and
    -- an alumnus are not staff, and 00053 already drew that line elsewhere.
    OR (
      organization_id = get_user_org_id()
      AND get_user_role() NOT IN ('candidate', 'alumni')
    )
  );
