-- ============================================================================
-- Compensation visibility model
--
-- Agreed rules:
--   * an employee sees their own
--   * a manager sees their team's
--   * HR sees everyone EXCEPT people in the leadership role
--   * leadership sees everyone
--
-- Two assumptions, both called out rather than buried:
--
--   1. "Their team" means DIRECT reports. Not the whole reporting tree — a
--      skip-level manager does not automatically see two levels down. Change
--      manages_employee() below if the whole tree is intended.
--
--   2. payroll_admin keeps sight of everyone, INCLUDING leadership. HR is
--      excluded from leadership pay as instructed, but somebody has to be able
--      to actually run payroll for the leadership team. If payroll_admin were
--      excluded too, only super_admin could process their salaries and payroll
--      would silently skip them.
-- ============================================================================

-- Is this employee in the leadership role?
CREATE OR REPLACE FUNCTION is_leadership_employee(p_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM employees e
    JOIN profiles p ON p.id = e.profile_id
    WHERE e.id = p_employee_id
      AND p.role = 'leadership'
  );
$$;

COMMENT ON FUNCTION is_leadership_employee(UUID) IS
  'True when the employee holds the leadership role. Used to keep leadership pay out of HR view.';

-- Does the signed-in user manage this employee directly?
CREATE OR REPLACE FUNCTION manages_employee(p_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM employees e
    WHERE e.id = p_employee_id
      AND e.reporting_manager_id IN (
        SELECT id FROM employees WHERE profile_id = auth.uid()
      )
  );
$$;

COMMENT ON FUNCTION manages_employee(UUID) IS
  'True when the signed-in user is the direct reporting manager of this employee.';

GRANT EXECUTE ON FUNCTION is_leadership_employee(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION manages_employee(UUID)       TO authenticated;

-- ── The shared rule ─────────────────────────────────────────────────────────
-- Expressed identically everywhere pay is visible, so there is one model to
-- reason about rather than four slightly different ones.

-- employee_compensation
DROP POLICY IF EXISTS "read_own_or_admin_compensation" ON employee_compensation;
CREATE POLICY "read_own_or_admin_compensation" ON employee_compensation
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'leadership', 'payroll_admin')
      OR (get_user_role() = 'hr_admin' AND NOT is_leadership_employee(employee_id))
      OR (get_user_role() = 'manager'  AND manages_employee(employee_id))
    )
  );

-- employee_compensation_components follows its parent record
DROP POLICY IF EXISTS "read_comp_components" ON employee_compensation_components;
CREATE POLICY "read_comp_components" ON employee_compensation_components
  FOR SELECT USING (
    employee_compensation_id IN (SELECT id FROM employee_compensation)
  );

-- payslips
DROP POLICY IF EXISTS "read_own_or_admin_payslips" ON payslips;
CREATE POLICY "read_own_or_admin_payslips" ON payslips
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'leadership', 'payroll_admin')
      OR (get_user_role() = 'hr_admin' AND NOT is_leadership_employee(employee_id))
      OR (get_user_role() = 'manager'  AND manages_employee(employee_id))
    )
  );

-- payroll run lines
DROP POLICY IF EXISTS "read_payroll_run_employees" ON payroll_run_employees;
CREATE POLICY "read_payroll_run_employees" ON payroll_run_employees
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'leadership', 'payroll_admin')
      OR (get_user_role() = 'hr_admin' AND NOT is_leadership_employee(employee_id))
      OR (get_user_role() = 'manager'  AND manages_employee(employee_id))
    )
  );

-- ── Salary structures ───────────────────────────────────────────────────────
-- These are grade bands rather than one person's pay. Managers need them to
-- have a sensible conversation about a raise.
DROP POLICY IF EXISTS "hr_reads_salary_structures" ON salary_structures;
CREATE POLICY "hr_reads_salary_structures" ON salary_structures
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin', 'leadership', 'manager')
  );

-- ── Income tax stays tighter ────────────────────────────────────────────────
-- A tax declaration lists someone's investments, rent and loans. That is more
-- personal than their salary, and a manager has no need for it. Unchanged from
-- 00035 except for the leadership carve-out, for consistency with pay.
DROP POLICY IF EXISTS "read_own_or_hr_tax_decl" ON employee_tax_declarations;
CREATE POLICY "read_own_or_hr_tax_decl" ON employee_tax_declarations
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'leadership', 'payroll_admin')
      OR (get_user_role() = 'hr_admin' AND NOT is_leadership_employee(employee_id))
    )
  );

DROP POLICY IF EXISTS "read_own_or_hr_tds" ON employee_tds_records;
CREATE POLICY "read_own_or_hr_tds" ON employee_tds_records
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'leadership', 'payroll_admin')
      OR (get_user_role() = 'hr_admin' AND NOT is_leadership_employee(employee_id))
    )
  );
