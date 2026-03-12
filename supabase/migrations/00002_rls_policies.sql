-- ============================================
-- Row Level Security Policies
-- ============================================

-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_org" ON organizations
  FOR SELECT USING (id = get_user_org_id());

CREATE POLICY "super_admin_update_org" ON organizations
  FOR UPDATE USING (id = get_user_org_id() AND get_user_role() = 'super_admin');

-- Allow insert during onboarding (profile may not have org yet)
CREATE POLICY "authenticated_insert_org" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_org_profiles" ON profiles
  FOR SELECT USING (organization_id = get_user_org_id() OR id = auth.uid());

CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "system_insert_profile" ON profiles
  FOR INSERT WITH CHECK (true);

-- Departments
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_read_departments" ON departments
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "admin_manage_departments" ON departments
  FOR INSERT WITH CHECK (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin'));

CREATE POLICY "admin_update_departments" ON departments
  FOR UPDATE USING (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin'));

CREATE POLICY "admin_delete_departments" ON departments
  FOR DELETE USING (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin'));

-- Designations
ALTER TABLE designations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_read_designations" ON designations
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "admin_manage_designations" ON designations
  FOR INSERT WITH CHECK (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin'));

CREATE POLICY "admin_update_designations" ON designations
  FOR UPDATE USING (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin'));

CREATE POLICY "admin_delete_designations" ON designations
  FOR DELETE USING (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin'));

-- Employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_read_employees" ON employees
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "admin_insert_employees" ON employees
  FOR INSERT WITH CHECK (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin'));

CREATE POLICY "admin_update_employees" ON employees
  FOR UPDATE USING (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin'));

-- Leave Types
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_read_leave_types" ON leave_types
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "admin_manage_leave_types" ON leave_types
  FOR ALL USING (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin'));

-- Leave Balances
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_or_admin_leave_balances" ON leave_balances
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE organization_id = get_user_org_id())
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin')
      OR employee_id IN (
        SELECT id FROM employees WHERE reporting_manager_id IN (
          SELECT id FROM employees WHERE profile_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "admin_manage_leave_balances" ON leave_balances
  FOR ALL USING (
    employee_id IN (SELECT id FROM employees WHERE organization_id = get_user_org_id())
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

-- Leave Requests
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_leave_requests" ON leave_requests
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin')
      OR employee_id IN (
        SELECT id FROM employees WHERE reporting_manager_id IN (
          SELECT id FROM employees WHERE profile_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "employee_insert_leave_request" ON leave_requests
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

CREATE POLICY "manage_leave_requests" ON leave_requests
  FOR UPDATE USING (
    organization_id = get_user_org_id()
    AND (
      get_user_role() IN ('super_admin', 'hr_admin')
      OR employee_id IN (
        SELECT id FROM employees WHERE reporting_manager_id IN (
          SELECT id FROM employees WHERE profile_id = auth.uid()
        )
      )
    )
  );

-- Attendance Records
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_attendance" ON attendance_records
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "manage_own_attendance" ON attendance_records
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

CREATE POLICY "update_own_attendance" ON attendance_records
  FOR UPDATE USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin')
    )
  );

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "update_own_notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "insert_notifications" ON notifications
  FOR INSERT WITH CHECK (organization_id = get_user_org_id());

-- Documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_org_documents" ON documents
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "admin_manage_documents" ON documents
  FOR ALL USING (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin'));

-- Holidays
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_org_holidays" ON holidays
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "admin_manage_holidays" ON holidays
  FOR ALL USING (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin'));

-- Announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_org_announcements" ON announcements
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "admin_manage_announcements" ON announcements
  FOR ALL USING (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin'));

-- Activity Log
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_org_activity" ON activity_log
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "insert_activity" ON activity_log
  FOR INSERT WITH CHECK (organization_id = get_user_org_id());

-- Shifts
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_org_shifts" ON shifts
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "admin_manage_shifts" ON shifts
  FOR ALL USING (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin'));
