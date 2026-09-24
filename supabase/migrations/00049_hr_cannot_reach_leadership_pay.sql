-- HR could still see leadership pay.
--
-- 00038 set the rule: HR sees everyone's compensation except leadership's. That
-- read policy was correct. What it missed is that the older `admin_manage_*`
-- policies are FOR ALL with a USING clause that hands hr_admin the whole
-- organisation — and Postgres ORs policies together, so the broad one won.
--
-- Caught in Phase 7 by giving one employee the leadership role and another the
-- HR role and looking: HR could read the leadership employee's compensation row,
-- while correctly seeing none of their payslips. The payslip policy was right
-- only because its manage policy never mentioned hr_admin.
--
-- This is the same shape as S12 in the first audit: a permissive policy left
-- alive beside a restrictive one.
--
-- super_admin and payroll_admin keep full reach. Payroll has to be able to pay
-- the leadership team, and somebody has to be able to fix their records.

-- ── employee_compensation ───────────────────────────────────────────────────

DROP POLICY IF EXISTS admin_manage_compensation ON employee_compensation;
CREATE POLICY admin_manage_compensation ON employee_compensation
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND (
      get_user_role() IN ('super_admin', 'payroll_admin')
      OR (get_user_role() = 'hr_admin' AND NOT is_leadership_employee(employee_id))
    )
  )
  WITH CHECK (
    organization_id = get_user_org_id()
    AND (
      get_user_role() IN ('super_admin', 'payroll_admin')
      OR (get_user_role() = 'hr_admin' AND NOT is_leadership_employee(employee_id))
    )
  );

-- ── employee_compensation_components ────────────────────────────────────────
-- Follows its parent record, so the carve-out follows too.

DROP POLICY IF EXISTS admin_manage_comp_components ON employee_compensation_components;
CREATE POLICY admin_manage_comp_components ON employee_compensation_components
  FOR ALL USING (
    employee_compensation_id IN (SELECT id FROM employee_compensation)
  )
  WITH CHECK (
    employee_compensation_id IN (SELECT id FROM employee_compensation)
  );

-- ── payroll_run_employees ───────────────────────────────────────────────────
-- One line per person per run, carrying gross, deductions and net.

DROP POLICY IF EXISTS admin_manage_payroll_run_employees ON payroll_run_employees;
CREATE POLICY admin_manage_payroll_run_employees ON payroll_run_employees
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND (
      get_user_role() IN ('super_admin', 'payroll_admin')
      OR (get_user_role() = 'hr_admin' AND NOT is_leadership_employee(employee_id))
    )
  )
  WITH CHECK (
    organization_id = get_user_org_id()
    AND (
      get_user_role() IN ('super_admin', 'payroll_admin')
      OR (get_user_role() = 'hr_admin' AND NOT is_leadership_employee(employee_id))
    )
  );
