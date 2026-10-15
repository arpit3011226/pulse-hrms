-- Two things testers hit on the Leave screens.
--
-- 1. Sick leave was offered for encashment. It should not be. Sick leave
--    exists so that somebody who is unwell stays at home; paying it out turns
--    it into a bonus for coming in ill, which is the opposite of the point.
--    Earned leave is the one that is normally encashed in India, and the only
--    one switched on here. There was no way to express the rule at all — no
--    column for it — so the screen offered every paid type.
--
-- 2. Nobody had a leave balance, so "My Leaves" said "No balance record found
--    for this leave type" and the encashment form asked for a number of days
--    between one and zero. Both messages were true and neither was any use.
--
-- The encashment rule is a property of the leave type, so HR can change it per
-- type without a release.

-- ── Which leave types may be encashed ───────────────────────────────────────

ALTER TABLE leave_types
  ADD COLUMN IF NOT EXISTS is_encashable BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN leave_types.is_encashable IS
  'May unused days of this type be paid out? Off by default; normally only earned leave.';

-- Earned leave carries forward and is the type that gets paid out. Casual,
-- sick and compensatory off do not, and are left off.
UPDATE leave_types
SET is_encashable = true
WHERE is_encashable = false
  AND (
    upper(COALESCE(code, '')) IN ('EL', 'PL', 'AL')
    OR name ILIKE '%earned%'
    OR name ILIKE '%privilege%'
  );

-- Said out loud, so nobody has to infer it from the absence of a row.
UPDATE leave_types
SET is_encashable = false
WHERE name ILIKE '%sick%' OR upper(COALESCE(code, '')) = 'SL';

-- ── Opening balances ────────────────────────────────────────────────────────

/**
 * Give an employee this year's balances, where they have none.
 *
 * Only fills the gaps: a type the person already has a row for is left exactly
 * as it is, so running this again never resets anybody's used days.
 */
CREATE OR REPLACE FUNCTION seed_leave_balances(p_org_id UUID, p_year INTEGER DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
  v_made INTEGER;
BEGIN
  INSERT INTO leave_balances (
    organization_id, employee_id, leave_type_id, year,
    total_days, used_days, pending_days, carried_forward_days,
    opening_balance, credited, debited, closing_balance
  )
  SELECT
    e.organization_id, e.id, lt.id, v_year,
    COALESCE(lt.default_days, 0), 0, 0, 0,
    COALESCE(lt.default_days, 0), 0, 0, COALESCE(lt.default_days, 0)
  FROM employees e
  CROSS JOIN leave_types lt
  WHERE e.organization_id = p_org_id
    AND lt.organization_id = p_org_id
    AND e.status = 'active'
    AND lt.is_active
    AND NOT EXISTS (
      SELECT 1 FROM leave_balances b
      WHERE b.employee_id = e.id AND b.leave_type_id = lt.id AND b.year = v_year
    );

  GET DIAGNOSTICS v_made = ROW_COUNT;
  RETURN v_made;
END $$;

REVOKE ALL ON FUNCTION public.seed_leave_balances(UUID, INTEGER) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION seed_leave_balances(UUID, INTEGER) IS
  'Fills in missing leave balances for a year. Never touches a balance that already exists.';

-- A new joiner gets their balances on the day they are added, rather than
-- waiting for an accrual run and wondering why the screen is empty.
CREATE OR REPLACE FUNCTION seed_balances_for_new_employee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  INSERT INTO leave_balances (
    organization_id, employee_id, leave_type_id, year,
    total_days, used_days, pending_days, carried_forward_days,
    opening_balance, credited, debited, closing_balance
  )
  SELECT
    NEW.organization_id, NEW.id, lt.id, v_year,
    COALESCE(lt.default_days, 0), 0, 0, 0,
    COALESCE(lt.default_days, 0), 0, 0, COALESCE(lt.default_days, 0)
  FROM leave_types lt
  WHERE lt.organization_id = NEW.organization_id
    AND lt.is_active
    AND NOT EXISTS (
      SELECT 1 FROM leave_balances b
      WHERE b.employee_id = NEW.id AND b.leave_type_id = lt.id AND b.year = v_year
    );

  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.seed_balances_for_new_employee() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_seed_balances_for_new_employee ON employees;
CREATE TRIGGER trg_seed_balances_for_new_employee
  AFTER INSERT ON employees
  FOR EACH ROW EXECUTE FUNCTION seed_balances_for_new_employee();

-- Everybody already on the rolls who has none for this year.
DO $$
DECLARE
  v_org UUID;
BEGIN
  FOR v_org IN SELECT id FROM organizations LOOP
    PERFORM seed_leave_balances(v_org, NULL);
  END LOOP;
END $$;
