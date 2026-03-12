-- HRMS Initial Schema Migration
-- Creates all core tables for the HRMS application

-- Custom enum for user roles
CREATE TYPE app_role AS ENUM ('super_admin', 'hr_admin', 'manager', 'employee');

-- ============================================
-- Organizations (Multi-Tenant Root)
-- ============================================
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

-- ============================================
-- Profiles (extends Supabase auth.users)
-- ============================================
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

-- ============================================
-- Departments
-- ============================================
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

-- ============================================
-- Designations
-- ============================================
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

-- ============================================
-- Employees
-- ============================================
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

-- ============================================
-- Leave Types
-- ============================================
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

-- ============================================
-- Leave Balances
-- ============================================
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

-- ============================================
-- Leave Requests
-- ============================================
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

-- ============================================
-- Shifts
-- ============================================
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

-- ============================================
-- Attendance Records
-- ============================================
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

-- ============================================
-- Holidays
-- ============================================
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

-- ============================================
-- Announcements
-- ============================================
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

-- ============================================
-- Notifications
-- ============================================
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

-- ============================================
-- Documents
-- ============================================
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

-- ============================================
-- Activity Log
-- ============================================
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

-- ============================================
-- Triggers: Auto-update updated_at
-- ============================================
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

-- ============================================
-- Trigger: Auto-create profile on signup
-- ============================================
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

-- ============================================
-- Helper Functions
-- ============================================
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS app_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;
