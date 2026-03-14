-- ============================================
-- 1. Previous Work Experience Table
-- ============================================

CREATE TABLE IF NOT EXISTS employee_previous_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  designation TEXT,
  department TEXT,
  employment_type TEXT CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern', 'freelance')),
  start_date DATE NOT NULL,
  end_date DATE,
  location TEXT,
  reason_for_leaving TEXT,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_previous_experience_updated_at
  BEFORE UPDATE ON employee_previous_experience
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE employee_previous_experience ENABLE ROW LEVEL SECURITY;

-- Admin (HR/Super Admin) can manage all
DROP POLICY IF EXISTS "admin_manage_previous_experience" ON employee_previous_experience;
CREATE POLICY "admin_manage_previous_experience" ON employee_previous_experience
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

-- Employees can manage their own
DROP POLICY IF EXISTS "employees_manage_own_experience" ON employee_previous_experience;
CREATE POLICY "employees_manage_own_experience" ON employee_previous_experience
  FOR ALL USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND organization_id = get_user_org_id()
  );

-- Org members can read all (for viewing colleague profiles)
DROP POLICY IF EXISTS "org_members_read_experience" ON employee_previous_experience;
CREATE POLICY "org_members_read_experience" ON employee_previous_experience
  FOR SELECT USING (organization_id = get_user_org_id());

-- ============================================
-- 2. Allow Manager/HR/Leadership to initiate separation
-- ============================================

-- Managers can insert exit records for direct reports
DROP POLICY IF EXISTS "manager_initiate_separation" ON employee_exit_records;
CREATE POLICY "manager_initiate_separation" ON employee_exit_records
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND employee_id IN (
      SELECT id FROM employees
      WHERE reporting_manager_id IN (
        SELECT id FROM employees WHERE profile_id = auth.uid()
      )
    )
  );

-- HR/Admin can insert exit records for any org employee
DROP POLICY IF EXISTS "hr_initiate_separation" ON employee_exit_records;
CREATE POLICY "hr_initiate_separation" ON employee_exit_records
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

-- Leadership can insert exit records for any org employee
DROP POLICY IF EXISTS "leadership_initiate_separation" ON employee_exit_records;
CREATE POLICY "leadership_initiate_separation" ON employee_exit_records
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND get_user_role() = 'leadership'
  );
