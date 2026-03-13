-- ============================================
-- Leave Management - Full PRD-Aligned Migration
-- ============================================

-- Extend leave_types with PRD columns
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS leave_code TEXT;
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS document_required_flag BOOLEAN DEFAULT false;
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS gender_specific_flag BOOLEAN DEFAULT false;

-- Extend leave_requests with half-day support
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS is_half_day BOOLEAN DEFAULT false;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS half_day_period TEXT; -- 'first_half' | 'second_half'

-- Add organization_id to leave_balances for easier admin queries
ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(5,1) DEFAULT 0;
ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS credited NUMERIC(5,1) DEFAULT 0;
ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS debited NUMERIC(5,1) DEFAULT 0;
ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS closing_balance NUMERIC(5,1) DEFAULT 0;

-- ============================================
-- Leave Policies
-- ============================================
CREATE TABLE IF NOT EXISTS leave_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  policy_name TEXT NOT NULL,
  policy_code TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, policy_name)
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON leave_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Leave Policy Details (per-leave-type rules within a policy)
-- ============================================
CREATE TABLE IF NOT EXISTS leave_policy_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_policy_id UUID NOT NULL REFERENCES leave_policies(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  entitled_days NUMERIC(5,1) NOT NULL DEFAULT 0,
  max_consecutive_days NUMERIC(5,1),
  min_days_per_request NUMERIC(5,1) DEFAULT 0.5,
  max_days_per_request NUMERIC(5,1),
  allow_half_day BOOLEAN DEFAULT true,
  allow_carry_forward BOOLEAN DEFAULT false,
  max_carry_forward_days NUMERIC(5,1) DEFAULT 0,
  carry_forward_expiry_months INTEGER,
  accrual_type TEXT DEFAULT 'yearly', -- 'yearly' | 'monthly' | 'quarterly'
  accrual_start_from TEXT DEFAULT 'joining_date', -- 'joining_date' | 'year_start'
  probation_applicable BOOLEAN DEFAULT false,
  notice_days_required INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(leave_policy_id, leave_type_id)
);

-- ============================================
-- Employee Leave Policy Map
-- ============================================
CREATE TABLE IF NOT EXISTS employee_leave_policy_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_policy_id UUID NOT NULL REFERENCES leave_policies(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  effective_to DATE,
  assigned_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, leave_policy_id, effective_from)
);

-- ============================================
-- Leave Request Days (day-by-day breakdown)
-- ============================================
CREATE TABLE IF NOT EXISTS leave_request_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  leave_date DATE NOT NULL,
  day_type TEXT DEFAULT 'full', -- 'full' | 'first_half' | 'second_half'
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(leave_request_id, leave_date)
);

-- ============================================
-- Leave Attachments
-- ============================================
CREATE TABLE IF NOT EXISTS leave_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Leave Encashment Requests
-- ============================================
CREATE TABLE IF NOT EXISTS leave_encashment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id),
  days_requested NUMERIC(5,1) NOT NULL,
  amount_per_day NUMERIC(12,2),
  total_amount NUMERIC(12,2),
  status TEXT DEFAULT 'pending',
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  period_year INTEGER NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON leave_encashment_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Leave Carry Forward Logs
-- ============================================
CREATE TABLE IF NOT EXISTS leave_carry_forward_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id),
  from_year INTEGER NOT NULL,
  to_year INTEGER NOT NULL,
  days_carried NUMERIC(5,1) DEFAULT 0,
  days_lapsed NUMERIC(5,1) DEFAULT 0,
  processed_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Leave Accrual Runs
-- ============================================
CREATE TABLE IF NOT EXISTS leave_accrual_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id),
  accrual_period TEXT NOT NULL, -- e.g., '2026-Q1', '2026-03'
  accrual_date DATE NOT NULL,
  employees_processed INTEGER DEFAULT 0,
  total_days_credited NUMERIC(8,1) DEFAULT 0,
  run_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Leave Blackout Periods
-- ============================================
CREATE TABLE IF NOT EXISTS leave_blackout_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  applicable_leave_type_ids UUID[], -- null means all leave types
  reason TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- RLS Policies for new tables
-- ============================================

-- Leave Policies
ALTER TABLE leave_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_read_leave_policies" ON leave_policies
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "admin_manage_leave_policies" ON leave_policies
  FOR ALL USING (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin'));

-- Leave Policy Details
ALTER TABLE leave_policy_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_leave_policy_details" ON leave_policy_details
  FOR SELECT USING (
    leave_policy_id IN (SELECT id FROM leave_policies WHERE organization_id = get_user_org_id())
  );

CREATE POLICY "admin_manage_leave_policy_details" ON leave_policy_details
  FOR ALL USING (
    leave_policy_id IN (SELECT id FROM leave_policies WHERE organization_id = get_user_org_id())
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

-- Employee Leave Policy Map
ALTER TABLE employee_leave_policy_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_leave_policy_map" ON employee_leave_policy_map
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin')
    )
  );

CREATE POLICY "admin_manage_leave_policy_map" ON employee_leave_policy_map
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

-- Leave Request Days
ALTER TABLE leave_request_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_leave_request_days" ON leave_request_days
  FOR SELECT USING (
    leave_request_id IN (
      SELECT id FROM leave_requests WHERE organization_id = get_user_org_id()
      AND (
        employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
        OR get_user_role() IN ('super_admin', 'hr_admin')
        OR employee_id IN (
          SELECT id FROM employees WHERE reporting_manager_id IN (
            SELECT id FROM employees WHERE profile_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "insert_leave_request_days" ON leave_request_days
  FOR INSERT WITH CHECK (
    leave_request_id IN (
      SELECT id FROM leave_requests WHERE organization_id = get_user_org_id()
    )
  );

CREATE POLICY "admin_manage_leave_request_days" ON leave_request_days
  FOR ALL USING (
    leave_request_id IN (
      SELECT id FROM leave_requests WHERE organization_id = get_user_org_id()
    )
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

-- Leave Attachments
ALTER TABLE leave_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_leave_attachments" ON leave_attachments
  FOR SELECT USING (
    leave_request_id IN (
      SELECT id FROM leave_requests WHERE organization_id = get_user_org_id()
    )
  );

CREATE POLICY "insert_leave_attachments" ON leave_attachments
  FOR INSERT WITH CHECK (
    leave_request_id IN (
      SELECT id FROM leave_requests WHERE organization_id = get_user_org_id()
    )
  );

-- Leave Encashment
ALTER TABLE leave_encashment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_leave_encashment" ON leave_encashment_requests
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin')
    )
  );

CREATE POLICY "employee_insert_encashment" ON leave_encashment_requests
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

CREATE POLICY "admin_manage_encashment" ON leave_encashment_requests
  FOR UPDATE USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

-- Leave Carry Forward Logs
ALTER TABLE leave_carry_forward_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_carry_forward_logs" ON leave_carry_forward_logs
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "admin_manage_carry_forward" ON leave_carry_forward_logs
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

-- Leave Accrual Runs
ALTER TABLE leave_accrual_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_accrual_runs" ON leave_accrual_runs
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "admin_manage_accrual_runs" ON leave_accrual_runs
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

-- Leave Blackout Periods
ALTER TABLE leave_blackout_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_blackout_periods" ON leave_blackout_periods
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "admin_manage_blackout_periods" ON leave_blackout_periods
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

-- ============================================
-- Indexes for Leave domain
-- ============================================
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_dates ON leave_requests(employee_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_type_year ON leave_balances(employee_id, leave_type_id, year);
CREATE INDEX IF NOT EXISTS idx_leave_request_days_request ON leave_request_days(leave_request_id);
CREATE INDEX IF NOT EXISTS idx_leave_request_days_date ON leave_request_days(leave_date);
CREATE INDEX IF NOT EXISTS idx_employee_leave_policy_map_employee ON employee_leave_policy_map(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_policy_details_policy ON leave_policy_details(leave_policy_id);
