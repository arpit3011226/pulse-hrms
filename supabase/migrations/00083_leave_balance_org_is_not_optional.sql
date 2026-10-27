-- ============================================================================
-- QA-40 (P1) — leave balances existed but could not be seen, so leave could
-- not be approved.
--
-- Reported from UAT: an employee with 12 days of casual leave and 9 still
-- available applied for 3 days. The approval dialog said "No balance record
-- found for this leave type and year" and refused to approve. The balance row
-- was there all along.
--
-- Migration 00004 added leave_balances.organization_id with the comment
-- "for easier admin queries". It was nullable, nothing backfilled it, and
-- nothing enforced it. Later, getAllLeaveBalances() started filtering on it:
--
--     .eq('organization_id', orgId).eq('year', year)
--
-- Every row where the column was null silently vanished from that query. In
-- this database that was 33 of 76 rows — including three of the four
-- belonging to the person who reported it. The dialog then saw no balance and
-- blocked the approval, which is the correct behaviour on the facts it was
-- given; it was given the wrong facts.
--
-- A denormalised column is only a convenience while it is guaranteed. The
-- moment something filters on it, a null is invisible data loss. So: fill it
-- in, derive it automatically, and make it required.
-- ============================================================================

-- ── Fill in what is missing ─────────────────────────────────────────────────

UPDATE leave_balances lb
SET organization_id = e.organization_id
FROM employees e
WHERE lb.employee_id = e.id
  AND lb.organization_id IS NULL;

-- ── Derive it, so nobody has to remember ────────────────────────────────────
--
-- The organisation is never a choice: it is whichever one the employee
-- belongs to. Leaving that to each caller is what produced the gap.

CREATE OR REPLACE FUNCTION set_leave_balance_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM employees WHERE id = NEW.employee_id;
  END IF;
  RETURN NEW;
END $$;

COMMENT ON FUNCTION set_leave_balance_org() IS
  'QA-40: the organisation follows the employee. Derived here so a caller that forgets it cannot create a row that admin screens filter out.';

DROP TRIGGER IF EXISTS trg_set_leave_balance_org ON leave_balances;
CREATE TRIGGER trg_set_leave_balance_org
  BEFORE INSERT OR UPDATE ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION set_leave_balance_org();

-- ── And make it required ────────────────────────────────────────────────────
-- Only if the backfill left nothing behind. A balance with no employee to
-- inherit from would otherwise fail the migration and block everything after
-- it; better to say so and move on.

DO $$
DECLARE
  orphans INTEGER;
BEGIN
  SELECT count(*) INTO orphans FROM leave_balances WHERE organization_id IS NULL;

  IF orphans = 0 THEN
    ALTER TABLE leave_balances ALTER COLUMN organization_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'QA-40: % leave balance row(s) still have no organisation — they have no matching employee. Left nullable; clean those up and set NOT NULL.', orphans;
  END IF;
END $$;
