-- ============================================
-- Fix: Ensure helper functions and RLS policies exist
-- (For databases where early migrations were skipped)
-- ============================================

-- Note: get_user_org_id(), get_user_role(), update_updated_at() already exist.
-- Only re-creating RLS policies below.

-- 1. Fix leave_types RLS
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_read_leave_types" ON leave_types;
CREATE POLICY "org_members_read_leave_types" ON leave_types
  FOR SELECT USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "admin_manage_leave_types" ON leave_types;
CREATE POLICY "admin_manage_leave_types" ON leave_types
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

-- 3. Fix employee_bank_accounts RLS
ALTER TABLE employee_bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees_read_own_bank" ON employee_bank_accounts;
CREATE POLICY "employees_read_own_bank" ON employee_bank_accounts
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    OR (
      organization_id = get_user_org_id()
      AND get_user_role() IN ('super_admin', 'hr_admin')
    )
  );

DROP POLICY IF EXISTS "admin_manage_bank" ON employee_bank_accounts;
CREATE POLICY "admin_manage_bank" ON employee_bank_accounts
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

DROP POLICY IF EXISTS "employees_manage_own_bank" ON employee_bank_accounts;
CREATE POLICY "employees_manage_own_bank" ON employee_bank_accounts
  FOR ALL USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND organization_id = get_user_org_id()
  );

-- 4. Fix other commonly affected tables
-- employee_addresses
ALTER TABLE employee_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_addresses" ON employee_addresses;
CREATE POLICY "admin_manage_addresses" ON employee_addresses
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );
DROP POLICY IF EXISTS "employees_manage_own_addresses" ON employee_addresses;
CREATE POLICY "employees_manage_own_addresses" ON employee_addresses
  FOR ALL USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND organization_id = get_user_org_id()
  );

-- employee_emergency_contacts
ALTER TABLE employee_emergency_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_contacts" ON employee_emergency_contacts;
CREATE POLICY "admin_manage_contacts" ON employee_emergency_contacts
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );
DROP POLICY IF EXISTS "employees_manage_own_contacts" ON employee_emergency_contacts;
CREATE POLICY "employees_manage_own_contacts" ON employee_emergency_contacts
  FOR ALL USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND organization_id = get_user_org_id()
  );

-- employee_identity_documents
ALTER TABLE employee_identity_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_identity_docs" ON employee_identity_documents;
CREATE POLICY "admin_manage_identity_docs" ON employee_identity_documents
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );
DROP POLICY IF EXISTS "employees_manage_own_identity_docs" ON employee_identity_documents;
CREATE POLICY "employees_manage_own_identity_docs" ON employee_identity_documents
  FOR ALL USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND organization_id = get_user_org_id()
  );

-- employee_dependents
ALTER TABLE employee_dependents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_dependents" ON employee_dependents;
CREATE POLICY "admin_manage_dependents" ON employee_dependents
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );
DROP POLICY IF EXISTS "employees_manage_own_dependents" ON employee_dependents;
CREATE POLICY "employees_manage_own_dependents" ON employee_dependents
  FOR ALL USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND organization_id = get_user_org_id()
  );

-- employee_nominees
ALTER TABLE employee_nominees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_nominees" ON employee_nominees;
CREATE POLICY "admin_manage_nominees" ON employee_nominees
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );
DROP POLICY IF EXISTS "employees_manage_own_nominees" ON employee_nominees;
CREATE POLICY "employees_manage_own_nominees" ON employee_nominees
  FOR ALL USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND organization_id = get_user_org_id()
  );

-- employee_documents
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_emp_documents" ON employee_documents;
CREATE POLICY "admin_manage_emp_documents" ON employee_documents
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );
DROP POLICY IF EXISTS "employees_read_own_documents" ON employee_documents;
CREATE POLICY "employees_read_own_documents" ON employee_documents
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND organization_id = get_user_org_id()
  );

-- 5. Fix base table RLS (employees, departments, designations)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_members_read_employees" ON employees;
CREATE POLICY "org_members_read_employees" ON employees
  FOR SELECT USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "admin_manage_employees" ON employees;
CREATE POLICY "admin_manage_employees" ON employees
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_members_read_departments" ON departments;
CREATE POLICY "org_members_read_departments" ON departments
  FOR SELECT USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "admin_manage_departments" ON departments;
CREATE POLICY "admin_manage_departments" ON departments
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

ALTER TABLE designations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_members_read_designations" ON designations;
CREATE POLICY "org_members_read_designations" ON designations
  FOR SELECT USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "admin_manage_designations" ON designations;
CREATE POLICY "admin_manage_designations" ON designations
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );
