-- ============================================================================
-- Migration 00005: Employee Lifecycle Management
-- Adds normalized employee sub-tables per PRD Section 8
-- ============================================================================

-- ============================================================================
-- 1. EXTEND EMPLOYEES TABLE
-- ============================================================================

ALTER TABLE employees ADD COLUMN IF NOT EXISTS salutation TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS official_phone TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS confirmation_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS religion TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS mother_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS spouse_name TEXT;

-- ============================================================================
-- 2. EMPLOYEE ADDRESSES (replaces JSONB current_address/permanent_address)
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  address_type TEXT NOT NULL CHECK (address_type IN ('permanent', 'current', 'emergency')),
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  country TEXT DEFAULT 'India',
  pincode TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_employee_addresses_updated_at
  BEFORE UPDATE ON employee_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 3. EMPLOYEE EMERGENCY CONTACTS (replaces JSONB emergency_contact)
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  priority_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_employee_emergency_contacts_updated_at
  BEFORE UPDATE ON employee_emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 4. EMPLOYEE IDENTITY DOCUMENTS (replaces flat pan/aadhar/passport columns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_identity_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('pan', 'aadhar', 'passport', 'voter_id', 'driving_license', 'other')),
  document_number TEXT NOT NULL,
  name_on_document TEXT,
  issue_date DATE,
  expiry_date DATE,
  file_url TEXT,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_employee_identity_documents_updated_at
  BEFORE UPDATE ON employee_identity_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 5. EMPLOYEE BANK ACCOUNTS (replaces JSONB bank_details)
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  branch_name TEXT,
  account_number TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  account_type TEXT DEFAULT 'savings' CHECK (account_type IN ('savings', 'current')),
  is_salary_account BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_employee_bank_accounts_updated_at
  BEFORE UPDATE ON employee_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 6. EMPLOYEE DEPENDENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_dependents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  dependent_name TEXT NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN ('father', 'mother', 'spouse', 'son', 'daughter', 'sibling', 'other')),
  dob DATE,
  gender TEXT,
  is_nominee BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_employee_dependents_updated_at
  BEFORE UPDATE ON employee_dependents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 7. EMPLOYEE NOMINEES
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_nominees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  nominee_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  allocation_percent NUMERIC(5,2) NOT NULL CHECK (allocation_percent > 0 AND allocation_percent <= 100),
  applicable_for TEXT NOT NULL CHECK (applicable_for IN ('pf', 'gratuity', 'insurance', 'pension', 'all')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_employee_nominees_updated_at
  BEFORE UPDATE ON employee_nominees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 8. EMPLOYEE WORK PROFILES (effective-dated org assignments)
-- Tracks promotions, transfers, redesignations, manager changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_work_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id),
  designation_id UUID REFERENCES designations(id),
  reporting_manager_id UUID REFERENCES employees(id),
  dotted_line_manager_id UUID REFERENCES employees(id),
  employment_type TEXT,
  effective_from DATE NOT NULL,
  effective_to DATE,
  change_reason TEXT,
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_employee_work_profiles_updated_at
  BEFORE UPDATE ON employee_work_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 9. EMPLOYEE EXIT RECORDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_exit_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  resignation_date DATE,
  last_working_date DATE,
  exit_type TEXT NOT NULL CHECK (exit_type IN ('resignation', 'termination', 'retirement', 'absconding', 'contract_end', 'mutual_separation')),
  exit_reason TEXT,
  regretted_attrition BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'initiated' CHECK (status IN ('initiated', 'notice_period', 'clearance_pending', 'clearance_completed', 'completed', 'withdrawn')),
  exit_interview_done BOOLEAN DEFAULT false,
  exit_interview_notes TEXT,
  clearance_status TEXT DEFAULT 'pending' CHECK (clearance_status IN ('pending', 'in_progress', 'completed')),
  notice_period_days INTEGER,
  notice_period_served INTEGER,
  shortfall_recovery_amount NUMERIC(12,2),
  initiated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_employee_exit_records_updated_at
  BEFORE UPDATE ON employee_exit_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 10. EMPLOYEE STATUS HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_on TIMESTAMPTZ DEFAULT now(),
  reason TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 11. EMPLOYEE ORG HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_org_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('promotion', 'transfer', 'redesignation', 'manager_change', 'initial_assignment')),
  old_department_id UUID REFERENCES departments(id),
  new_department_id UUID REFERENCES departments(id),
  old_designation_id UUID REFERENCES designations(id),
  new_designation_id UUID REFERENCES designations(id),
  old_manager_id UUID REFERENCES employees(id),
  new_manager_id UUID REFERENCES employees(id),
  effective_from DATE NOT NULL,
  remarks TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 12. EMPLOYEE DOCUMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  document_category TEXT NOT NULL CHECK (document_category IN ('offer_letter', 'appointment_letter', 'experience_letter', 'payslip', 'tax_document', 'policy_acknowledgement', 'training_certificate', 'performance_review', 'other')),
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  expiry_date DATE,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_employee_documents_updated_at
  BEFORE UPDATE ON employee_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 13. RLS POLICIES
-- ============================================================================

-- Helper: Enable RLS on all new tables
ALTER TABLE employee_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_identity_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_nominees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_work_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_exit_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_org_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;

-- Pattern: org members can read, admin/hr can manage, employees see own records

-- employee_addresses
CREATE POLICY "employees_read_own_addresses" ON employee_addresses
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    OR organization_id = get_user_org_id()
      AND get_user_role() IN ('super_admin', 'hr_admin')
  );
CREATE POLICY "admin_manage_addresses" ON employee_addresses
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );
CREATE POLICY "employees_manage_own_addresses" ON employee_addresses
  FOR ALL USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND organization_id = get_user_org_id()
  );

-- employee_emergency_contacts
CREATE POLICY "employees_read_own_contacts" ON employee_emergency_contacts
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    OR organization_id = get_user_org_id()
      AND get_user_role() IN ('super_admin', 'hr_admin')
  );
CREATE POLICY "admin_manage_contacts" ON employee_emergency_contacts
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );
CREATE POLICY "employees_manage_own_contacts" ON employee_emergency_contacts
  FOR ALL USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND organization_id = get_user_org_id()
  );

-- employee_identity_documents
CREATE POLICY "employees_read_own_docs" ON employee_identity_documents
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    OR organization_id = get_user_org_id()
      AND get_user_role() IN ('super_admin', 'hr_admin')
  );
CREATE POLICY "admin_manage_identity_docs" ON employee_identity_documents
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );
CREATE POLICY "employees_manage_own_identity_docs" ON employee_identity_documents
  FOR ALL USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND organization_id = get_user_org_id()
  );

-- employee_bank_accounts
CREATE POLICY "employees_read_own_bank" ON employee_bank_accounts
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    OR organization_id = get_user_org_id()
      AND get_user_role() IN ('super_admin', 'hr_admin')
  );
CREATE POLICY "admin_manage_bank" ON employee_bank_accounts
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );
CREATE POLICY "employees_manage_own_bank" ON employee_bank_accounts
  FOR ALL USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND organization_id = get_user_org_id()
  );

-- employee_dependents
CREATE POLICY "employees_read_own_dependents" ON employee_dependents
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    OR organization_id = get_user_org_id()
      AND get_user_role() IN ('super_admin', 'hr_admin')
  );
CREATE POLICY "admin_manage_dependents" ON employee_dependents
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );
CREATE POLICY "employees_manage_own_dependents" ON employee_dependents
  FOR ALL USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND organization_id = get_user_org_id()
  );

-- employee_nominees
CREATE POLICY "employees_read_own_nominees" ON employee_nominees
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    OR organization_id = get_user_org_id()
      AND get_user_role() IN ('super_admin', 'hr_admin')
  );
CREATE POLICY "admin_manage_nominees" ON employee_nominees
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );
CREATE POLICY "employees_manage_own_nominees" ON employee_nominees
  FOR ALL USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND organization_id = get_user_org_id()
  );

-- employee_work_profiles
CREATE POLICY "org_read_work_profiles" ON employee_work_profiles
  FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "admin_manage_work_profiles" ON employee_work_profiles
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

-- employee_exit_records
CREATE POLICY "org_read_exit_records" ON employee_exit_records
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    OR organization_id = get_user_org_id()
      AND get_user_role() IN ('super_admin', 'hr_admin', 'manager')
  );
CREATE POLICY "admin_manage_exit_records" ON employee_exit_records
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

-- employee_status_history
CREATE POLICY "org_read_status_history" ON employee_status_history
  FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "admin_insert_status_history" ON employee_status_history
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

-- employee_org_history
CREATE POLICY "org_read_org_history" ON employee_org_history
  FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "admin_insert_org_history" ON employee_org_history
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

-- employee_documents
CREATE POLICY "employees_read_own_documents" ON employee_documents
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    OR organization_id = get_user_org_id()
      AND get_user_role() IN ('super_admin', 'hr_admin')
  );
CREATE POLICY "admin_manage_documents" ON employee_documents
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );
CREATE POLICY "employees_manage_own_documents" ON employee_documents
  FOR ALL USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND organization_id = get_user_org_id()
  );

-- ============================================================================
-- 14. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_employee_addresses_employee ON employee_addresses(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_addresses_org ON employee_addresses(organization_id);

CREATE INDEX IF NOT EXISTS idx_employee_emergency_contacts_employee ON employee_emergency_contacts(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_identity_documents_employee ON employee_identity_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_identity_documents_type ON employee_identity_documents(employee_id, document_type);

CREATE INDEX IF NOT EXISTS idx_employee_bank_accounts_employee ON employee_bank_accounts(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_dependents_employee ON employee_dependents(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_nominees_employee ON employee_nominees(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_work_profiles_employee ON employee_work_profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_work_profiles_current ON employee_work_profiles(employee_id, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_employee_work_profiles_effective ON employee_work_profiles(employee_id, effective_from DESC);

CREATE INDEX IF NOT EXISTS idx_employee_exit_records_employee ON employee_exit_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_exit_records_status ON employee_exit_records(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_employee_status_history_employee ON employee_status_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_status_history_date ON employee_status_history(employee_id, changed_on DESC);

CREATE INDEX IF NOT EXISTS idx_employee_org_history_employee ON employee_org_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_org_history_date ON employee_org_history(employee_id, effective_from DESC);

CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_category ON employee_documents(employee_id, document_category);
