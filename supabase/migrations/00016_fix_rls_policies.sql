-- ============================================
-- Fix RLS policies for broader role access
-- ============================================

-- Payroll Cycles: Add hr_admin role
DROP POLICY IF EXISTS "admin_manage_payroll_cycles" ON payroll_cycles;
CREATE POLICY "admin_manage_payroll_cycles" ON payroll_cycles FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin', 'payroll_admin')
  ));

-- Payroll Runs: Add hr_admin role
DROP POLICY IF EXISTS "admin_manage_payroll_runs" ON payroll_runs;
CREATE POLICY "admin_manage_payroll_runs" ON payroll_runs FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin', 'payroll_admin')
  ));

-- Payroll Run Employees: Add hr_admin role
DROP POLICY IF EXISTS "admin_manage_payroll_run_employees" ON payroll_run_employees;
CREATE POLICY "admin_manage_payroll_run_employees" ON payroll_run_employees FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin', 'payroll_admin')
  ));

-- Payroll Adjustments: Add hr_admin role
DROP POLICY IF EXISTS "admin_manage_payroll_adjustments" ON payroll_adjustments;
CREATE POLICY "admin_manage_payroll_adjustments" ON payroll_adjustments FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin', 'payroll_admin')
  ));

-- Attendance Records: Allow admin/HR to insert on behalf of employees
DROP POLICY IF EXISTS "manage_own_attendance" ON attendance_records;
CREATE POLICY "manage_own_attendance" ON attendance_records
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin')
    )
  );

-- Review Competencies: Also allow manager role
DROP POLICY IF EXISTS "Admin can manage review_competencies" ON review_competencies;
CREATE POLICY "Admin can manage review_competencies" ON review_competencies FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin', 'manager'))
);

-- Performance Cycles: Also allow manager role
DROP POLICY IF EXISTS "Admin can manage performance_cycles" ON performance_cycles;
CREATE POLICY "Admin can manage performance_cycles" ON performance_cycles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin', 'manager'))
);
