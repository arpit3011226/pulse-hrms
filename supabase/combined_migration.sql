-- =============================================
-- COMBINED MIGRATION: Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- MIGRATION 1: Initial Schema
-- =============================================

-- Custom enum for user roles
CREATE TYPE app_role AS ENUM ('super_admin', 'hr_admin', 'manager', 'employee');

-- Organizations (Multi-Tenant Root)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  domain TEXT,
  address JSONB,
  phone TEXT,
  email TEXT,
  website TEXT,
  industry TEXT,
  employee_count_range TEXT,
  fiscal_year_start INTEGER DEFAULT 1,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  currency TEXT DEFAULT 'INR',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  role app_role NOT NULL DEFAULT 'employee',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Departments
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  parent_department_id UUID REFERENCES departments(id),
  head_employee_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Designations
CREATE TABLE designations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  level INTEGER,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, title)
);

-- Employees
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID UNIQUE REFERENCES profiles(id),
  employee_code TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  personal_email TEXT,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT,
  marital_status TEXT,
  blood_group TEXT,
  department_id UUID REFERENCES departments(id),
  designation_id UUID REFERENCES designations(id),
  reporting_manager_id UUID REFERENCES employees(id),
  employment_type TEXT DEFAULT 'full_time',
  date_of_joining DATE,
  date_of_leaving DATE,
  probation_end_date DATE,
  status TEXT DEFAULT 'active',
  current_address JSONB,
  permanent_address JSONB,
  pan_number TEXT,
  aadhar_number TEXT,
  passport_number TEXT,
  bank_details JSONB,
  emergency_contact JSONB,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, employee_code),
  UNIQUE(organization_id, email)
);

-- Add FK for department head after employees table exists
ALTER TABLE departments
  ADD CONSTRAINT fk_departments_head_employee
  FOREIGN KEY (head_employee_id) REFERENCES employees(id);

-- Leave Types
CREATE TABLE leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  default_days NUMERIC(5,1) NOT NULL,
  is_carry_forward BOOLEAN DEFAULT false,
  max_carry_forward_days NUMERIC(5,1) DEFAULT 0,
  is_paid BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  applicable_gender TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Leave Balances
CREATE TABLE leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_days NUMERIC(5,1) NOT NULL,
  used_days NUMERIC(5,1) DEFAULT 0,
  pending_days NUMERIC(5,1) DEFAULT 0,
  carried_forward_days NUMERIC(5,1) DEFAULT 0,
  UNIQUE(employee_id, leave_type_id, year)
);

-- Leave Requests
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  leave_type_id UUID NOT NULL REFERENCES leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(5,1) NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Shifts
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  grace_period_minutes INTEGER DEFAULT 15,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Attendance Records
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  shift_id UUID REFERENCES shifts(id),
  status TEXT DEFAULT 'present',
  work_hours NUMERIC(5,2),
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  is_regularized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Holidays
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT DEFAULT 'public',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, date, name)
);

-- Announcements
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  content TEXT,
  priority TEXT DEFAULT 'normal',
  target_departments UUID[],
  published_by UUID REFERENCES employees(id),
  is_active BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  message TEXT,
  type TEXT,
  reference_type TEXT,
  reference_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_id UUID REFERENCES employees(id),
  name TEXT NOT NULL,
  type TEXT,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activity Log
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Triggers: Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Helper Functions
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS app_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- MIGRATION 2: RLS Policies
-- =============================================

-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_org" ON organizations
  FOR SELECT USING (id = get_user_org_id());

CREATE POLICY "super_admin_update_org" ON organizations
  FOR UPDATE USING (id = get_user_org_id() AND get_user_role() = 'super_admin');

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

-- =============================================
-- MIGRATION 3: Add payroll_admin role
-- =============================================
ALTER TYPE app_role ADD VALUE 'payroll_admin';
