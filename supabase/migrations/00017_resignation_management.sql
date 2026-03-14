-- ============================================
-- Resignation Management + Notifications + NOC
-- ============================================

-- 1. Extend employee_exit_records with approval tracking
ALTER TABLE employee_exit_records ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft';
ALTER TABLE employee_exit_records ADD COLUMN IF NOT EXISTS manager_approved_by UUID REFERENCES employees(id);
ALTER TABLE employee_exit_records ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMPTZ;
ALTER TABLE employee_exit_records ADD COLUMN IF NOT EXISTS manager_remarks TEXT;
ALTER TABLE employee_exit_records ADD COLUMN IF NOT EXISTS hr_approved_by UUID REFERENCES employees(id);
ALTER TABLE employee_exit_records ADD COLUMN IF NOT EXISTS hr_approved_at TIMESTAMPTZ;
ALTER TABLE employee_exit_records ADD COLUMN IF NOT EXISTS hr_remarks TEXT;
ALTER TABLE employee_exit_records ADD COLUMN IF NOT EXISTS hr_override_last_working_date DATE;

-- Add CHECK constraint for approval_status
ALTER TABLE employee_exit_records DROP CONSTRAINT IF EXISTS employee_exit_records_approval_status_check;
ALTER TABLE employee_exit_records ADD CONSTRAINT employee_exit_records_approval_status_check
  CHECK (approval_status IN ('draft', 'submitted', 'manager_approved', 'manager_rejected', 'hr_approved', 'hr_rejected', 'withdrawn'));

-- Index for approval queries
CREATE INDEX IF NOT EXISTS idx_exit_records_approval_status ON employee_exit_records(organization_id, approval_status);

-- 2. Allow employees to submit their own resignation
DROP POLICY IF EXISTS "employee_submit_resignation" ON employee_exit_records;
CREATE POLICY "employee_submit_resignation" ON employee_exit_records
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND exit_type = 'resignation'
  );

-- Allow employees to read their own exit records
DROP POLICY IF EXISTS "employee_read_own_exit" ON employee_exit_records;
CREATE POLICY "employee_read_own_exit" ON employee_exit_records
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

-- Allow managers to read exit records of their direct reports
DROP POLICY IF EXISTS "manager_read_team_exit" ON employee_exit_records;
CREATE POLICY "manager_read_team_exit" ON employee_exit_records
  FOR SELECT USING (
    employee_id IN (
      SELECT id FROM employees WHERE reporting_manager_id IN (
        SELECT id FROM employees WHERE profile_id = auth.uid()
      )
    )
  );

-- Allow managers to update exit records (for approval) of their direct reports
DROP POLICY IF EXISTS "manager_approve_exit" ON employee_exit_records;
CREATE POLICY "manager_approve_exit" ON employee_exit_records
  FOR UPDATE USING (
    employee_id IN (
      SELECT id FROM employees WHERE reporting_manager_id IN (
        SELECT id FROM employees WHERE profile_id = auth.uid()
      )
    )
  );

-- Allow employees to update their own resignation (for withdrawal)
DROP POLICY IF EXISTS "employee_withdraw_resignation" ON employee_exit_records;
CREATE POLICY "employee_withdraw_resignation" ON employee_exit_records
  FOR UPDATE USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND exit_type = 'resignation'
  );

-- ============================================
-- 3. Exit Clearances (NOC) table
-- ============================================

CREATE TABLE IF NOT EXISTS exit_clearances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  exit_record_id UUID NOT NULL REFERENCES employee_exit_records(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  department_name TEXT NOT NULL,
  clearance_status TEXT DEFAULT 'pending' CHECK (clearance_status IN ('pending', 'no_objection', 'objection')),
  cleared_by UUID REFERENCES employees(id),
  cleared_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE exit_clearances ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_exit_clearances_record ON exit_clearances(exit_record_id);
CREATE INDEX IF NOT EXISTS idx_exit_clearances_org_status ON exit_clearances(organization_id, clearance_status);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER set_exit_clearances_updated_at
  BEFORE UPDATE ON exit_clearances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: employees can read their own clearances
DROP POLICY IF EXISTS "employee_read_own_clearances" ON exit_clearances;
CREATE POLICY "employee_read_own_clearances" ON exit_clearances
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

-- RLS: hr_admin/super_admin can manage all clearances
DROP POLICY IF EXISTS "admin_manage_clearances" ON exit_clearances;
CREATE POLICY "admin_manage_clearances" ON exit_clearances
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin')
    )
  );

-- RLS: any org member can update clearances (dept reps)
DROP POLICY IF EXISTS "dept_update_clearances" ON exit_clearances;
CREATE POLICY "dept_update_clearances" ON exit_clearances
  FOR UPDATE USING (
    organization_id = get_user_org_id()
  );

-- RLS: any org member can read clearances
DROP POLICY IF EXISTS "org_read_clearances" ON exit_clearances;
CREATE POLICY "org_read_clearances" ON exit_clearances
  FOR SELECT USING (
    organization_id = get_user_org_id()
  );

-- ============================================
-- 4. Notifications table
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'resignation_submitted', 'resignation_manager_approved', 'resignation_hr_approved',
    'resignation_rejected', 'clearance_requested', 'clearance_updated', 'general'
  )),
  reference_id UUID,
  reference_type TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_profile_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);

-- RLS: users can only read/update their own notifications
DROP POLICY IF EXISTS "user_read_own_notifications" ON notifications;
CREATE POLICY "user_read_own_notifications" ON notifications
  FOR SELECT USING (recipient_profile_id = auth.uid());

DROP POLICY IF EXISTS "user_update_own_notifications" ON notifications;
CREATE POLICY "user_update_own_notifications" ON notifications
  FOR UPDATE USING (recipient_profile_id = auth.uid());

-- RLS: any authenticated user in org can insert notifications
DROP POLICY IF EXISTS "org_insert_notifications" ON notifications;
CREATE POLICY "org_insert_notifications" ON notifications
  FOR INSERT WITH CHECK (organization_id = get_user_org_id());
