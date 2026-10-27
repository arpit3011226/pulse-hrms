-- ============================================================================
-- QA-45 (P1) — HR could delete an entire month's payroll, payslips and all.
--
-- Found by QA/scripts/write_matrix.py, a new audit that asks what each role
-- can CHANGE. The long-standing access_matrix.py asks only what each role can
-- READ, which is why this sat here as long as QA-36 did.
--
-- QA-34 established the segregation of duties and enforced it carefully:
-- payroll_earnings, payroll_deductions and payslips are writable only by a
-- payroll admin or a super admin. HR may set up a cycle; HR may not compute
-- the money. All of that held.
--
-- What nobody checked was DELETE on the row above them. admin_manage_payroll_runs
-- was FOR ALL and included hr_admin, and the foreign keys cascade:
--
--     payroll_runs
--       └── payroll_run_employees        ON DELETE CASCADE
--             ├── payroll_earnings       ON DELETE CASCADE
--             ├── payroll_deductions     ON DELETE CASCADE
--             └── payslips               ON DELETE CASCADE
--
-- Proved against this database as the demo HR admin, rolled back:
--
--     delete from payroll_runs where id = (select id from payroll_runs limit 1)
--     → 1 row
--
-- So an HR admin could not alter a single payslip, and could erase every one
-- of them with one request. The control on writing was built with care and
-- the control on deleting was never considered — which is the more dangerous
-- half, because a wrong figure is visible and a missing record is not.
--
-- Two changes. First, writing a run belongs to whoever may compute it.
-- Second, a run that has been approved or completed is not deletable by
-- anybody through the API, whatever their role: that is a paid month, and
-- the payslips under it are what people are owed.
-- ============================================================================

DROP POLICY IF EXISTS "admin_manage_payroll_runs" ON payroll_runs;

-- Reading stays as it was: HR and payroll both need to see a run.
-- (read_payroll_runs is untouched.)

CREATE POLICY "payroll_admin_writes_payroll_runs" ON payroll_runs
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'payroll_admin')
  ) WITH CHECK (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'payroll_admin')
  );

COMMENT ON POLICY "payroll_admin_writes_payroll_runs" ON payroll_runs IS
  'QA-45: writing a run belongs to whoever may compute it. HR reads but does not touch, matching payslips and the earning and deduction lines.';

-- ── A paid month cannot be erased ───────────────────────────────────────────
--
-- Belt as well as braces. The policy above decides WHO; this decides WHAT,
-- and it holds for a payroll admin and a super admin too. Deleting a run
-- that has been approved or completed takes every payslip under it, and
-- those are the record of what people were actually paid.

CREATE OR REPLACE FUNCTION refuse_to_delete_settled_payroll()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Migrations and the service role keep a way through, for a genuine
  -- correction made deliberately rather than through a screen.
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN OLD;
  END IF;

  IF OLD.run_status IN ('approved', 'completed', 'paid', 'published') THEN
    RAISE EXCEPTION
      'This payroll run has been settled and cannot be deleted. Every payslip under it would go with it.'
      USING ERRCODE = '42501';
  END IF;

  RETURN OLD;
END $$;

COMMENT ON FUNCTION refuse_to_delete_settled_payroll() IS
  'QA-45: a settled run cascades to payroll_run_employees, earnings, deductions and payslips. Nobody deletes a paid month through the API.';

DROP TRIGGER IF EXISTS trg_refuse_to_delete_settled_payroll ON payroll_runs;
CREATE TRIGGER trg_refuse_to_delete_settled_payroll
  BEFORE DELETE ON payroll_runs
  FOR EACH ROW EXECUTE FUNCTION refuse_to_delete_settled_payroll();
