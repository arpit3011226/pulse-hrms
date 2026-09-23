-- ============================================================================
-- SECURITY FIX — payroll and tax row-level security
--
-- Found while building alumni document access.
--
-- The policies below were named "read_own_or_admin_*" but their condition was
-- only `organization_id = my org`. In a single-organisation deployment that is
-- every authenticated user. The practical effect:
--
--   * any employee could read EVERY payslip in the company
--   * any employee could read EVERY salary and its breakdown
--   * any employee could read every payroll run line, earning and deduction
--   * the two income-tax policies had no FOR clause, so they defaulted to
--     FOR ALL — any employee could also WRITE anyone's tax declaration
--
-- Correct scope: you can read your own; HR, payroll and leadership can read
-- everyone's. Nobody else.
--
-- Note for managers: this deliberately does NOT give managers sight of their
-- team's salaries. Add 'manager' to the role lists below if that is the
-- intended policy — it should be a decision, not a leftover.
-- ============================================================================

-- Helper: the employee rows belonging to the signed-in user.
-- Written inline rather than as a function so the intent is visible in each
-- policy and there is no indirection to audit.

-- ── payslips ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "read_own_or_admin_payslips" ON payslips;
CREATE POLICY "read_own_or_admin_payslips" ON payslips
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin', 'leadership')
    )
  );

-- ── employee_compensation ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "read_own_or_admin_compensation" ON employee_compensation;
CREATE POLICY "read_own_or_admin_compensation" ON employee_compensation
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS "read_comp_components" ON employee_compensation_components;
CREATE POLICY "read_comp_components" ON employee_compensation_components
  FOR SELECT USING (
    employee_compensation_id IN (
      SELECT id FROM employee_compensation
      WHERE organization_id = get_user_org_id()
        AND (
          employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
          OR get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin', 'leadership')
        )
    )
  );

-- ── payroll run lines ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "read_payroll_run_employees" ON payroll_run_employees;
CREATE POLICY "read_payroll_run_employees" ON payroll_run_employees
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS "read_payroll_earnings" ON payroll_earnings;
CREATE POLICY "read_payroll_earnings" ON payroll_earnings
  FOR SELECT USING (
    payroll_run_employee_id IN (SELECT id FROM payroll_run_employees)
  );

DROP POLICY IF EXISTS "read_payroll_deductions" ON payroll_deductions;
CREATE POLICY "read_payroll_deductions" ON payroll_deductions
  FOR SELECT USING (
    payroll_run_employee_id IN (SELECT id FROM payroll_run_employees)
  );

-- ── income tax ──────────────────────────────────────────────────────────────
-- These two had no FOR clause at all, so they were FOR ALL: read and write,
-- for anyone in the organisation. Split into read-own and manage-own, with
-- HR and payroll able to see and verify everyone's.

DROP POLICY IF EXISTS "org_isolation_tax_decl" ON employee_tax_declarations;

CREATE POLICY "read_own_or_hr_tax_decl" ON employee_tax_declarations
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin', 'leadership')
    )
  );

-- An employee may create and change their own declaration.
CREATE POLICY "employee_manages_own_tax_decl" ON employee_tax_declarations
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

-- HR and payroll verify and correct declarations.
CREATE POLICY "hr_manages_tax_decl" ON employee_tax_declarations
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin')
  );

DROP POLICY IF EXISTS "org_isolation_tds" ON employee_tds_records;

CREATE POLICY "read_own_or_hr_tds" ON employee_tds_records
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin', 'leadership')
    )
  );

-- TDS records are computed by payroll, never by the employee.
CREATE POLICY "payroll_manages_tds" ON employee_tds_records
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin')
  );
