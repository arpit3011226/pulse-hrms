-- QA-01: every employee could read the company's payroll totals.
--
-- `payroll_runs` carries total_employees, total_gross, total_deductions and
-- total_net_pay, and `org_members_read_payroll_runs` let any signed-in member
-- of the organisation read it. Verified as an ordinary employee before this
-- change: total gross 10,66,667 across 10 people, which is an average salary
-- for anybody who can divide.
--
-- Per-person payroll was never exposed — payroll_run_employees, payroll_earnings
-- and payroll_deductions were already closed, and 00049's rule keeping HR away
-- from leadership pay still holds. It was only the org-level totals, which are
-- arguably the more sensitive figure: one number tells you the whole wage bill.
--
-- Payroll cycles go the same way. A cycle is just a period and a status, but
-- nothing outside the payroll screens reads it either, and the processing
-- status of a payroll run is not information an employee needs.
--
-- Both are read only by the Payroll Runs tab and the payroll workflow, which
-- are admin screens, so nothing employee-facing loses anything.

DROP POLICY IF EXISTS org_members_read_payroll_runs ON payroll_runs;
CREATE POLICY read_payroll_runs ON payroll_runs
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin', 'leadership')
  );

DROP POLICY IF EXISTS org_members_read_payroll_cycles ON payroll_cycles;
CREATE POLICY read_payroll_cycles ON payroll_cycles
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin', 'leadership')
  );

COMMENT ON TABLE payroll_runs IS
  'A payroll run and its totals. Payroll, HR, admin and leadership only — the totals are the whole wage bill.';
