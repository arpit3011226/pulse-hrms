-- ============================================================================
-- 00006: Attendance Extensions — Shift Rosters & Regularization Requests
-- ============================================================================

-- Shift Rosters — assign employees to shifts for date ranges
CREATE TABLE IF NOT EXISTS shift_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  shift_id UUID NOT NULL REFERENCES shifts(id),
  start_date DATE NOT NULL,
  end_date DATE,                          -- NULL = indefinite
  assigned_by UUID REFERENCES employees(id),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Attendance Regularization Requests — correct missed/wrong attendance
CREATE TABLE IF NOT EXISTS attendance_regularization_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  attendance_record_id UUID REFERENCES attendance_records(id),
  date DATE NOT NULL,
  original_clock_in TIMESTAMPTZ,
  original_clock_out TIMESTAMPTZ,
  requested_clock_in TIMESTAMPTZ,
  requested_clock_out TIMESTAMPTZ,
  original_status TEXT,
  requested_status TEXT,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES employees(id),
  reviewed_at TIMESTAMPTZ,
  review_remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_shift_rosters_org ON shift_rosters(organization_id);
CREATE INDEX IF NOT EXISTS idx_shift_rosters_employee ON shift_rosters(employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_rosters_shift ON shift_rosters(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_rosters_dates ON shift_rosters(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_regularization_org ON attendance_regularization_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_regularization_employee ON attendance_regularization_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_regularization_status ON attendance_regularization_requests(status);
CREATE INDEX IF NOT EXISTS idx_regularization_date ON attendance_regularization_requests(date);
CREATE INDEX IF NOT EXISTS idx_regularization_record ON attendance_regularization_requests(attendance_record_id);

-- ============================================================================
-- Triggers
-- ============================================================================

CREATE OR REPLACE TRIGGER set_shift_rosters_updated_at
  BEFORE UPDATE ON shift_rosters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER set_regularization_updated_at
  BEFORE UPDATE ON attendance_regularization_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE shift_rosters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_org_shift_rosters" ON shift_rosters
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "admin_manage_shift_rosters" ON shift_rosters
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

ALTER TABLE attendance_regularization_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_org_regularizations" ON attendance_regularization_requests
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "employee_create_regularization" ON attendance_regularization_requests
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

CREATE POLICY "admin_manage_regularizations" ON attendance_regularization_requests
  FOR UPDATE USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'manager')
  );
