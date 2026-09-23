-- ============================================================================
-- SECURITY — remove a leftover permissive policy
--
-- In 00035 I dropped "read_payroll_run_employees" and created a correctly
-- scoped replacement. But the original policy in 00007 is called
-- "read_own_or_admin_payroll_results", so the DROP matched nothing and the
-- permissive policy stayed live alongside the new one.
--
-- Policies are OR'd, so the permissive one won: every payroll run line was
-- still readable by any employee, and payroll_earnings / payroll_deductions
-- inherit their scope from this table, so they were open too.
-- ============================================================================

DROP POLICY IF EXISTS "read_own_or_admin_payroll_results" ON payroll_run_employees;

-- Confirm the correctly scoped policy from 00035 is the only SELECT path.
DROP POLICY IF EXISTS "read_payroll_run_employees" ON payroll_run_employees;
CREATE POLICY "read_payroll_run_employees" ON payroll_run_employees
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin', 'leadership')
    )
  );
