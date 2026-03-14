-- ============================================================================
-- 00015: Payroll Configuration & Two-Level Approval Flow
-- ============================================================================

-- Payroll configuration per organization
CREATE TABLE IF NOT EXISTS payroll_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) UNIQUE,
  -- Pay day settings
  pay_day_type TEXT NOT NULL DEFAULT 'last_working_friday'
    CHECK (pay_day_type IN ('last_working_friday', 'fixed_date', 'last_day_of_month')),
  fixed_pay_day INTEGER, -- 1-28 if type is fixed_date
  skip_holidays BOOLEAN DEFAULT true,
  -- Reminder settings
  reminder_days_before INTEGER DEFAULT 5,
  reminder_enabled BOOLEAN DEFAULT true,
  -- Approval settings
  require_two_level_approval BOOLEAN DEFAULT true,
  first_approver_role TEXT DEFAULT 'payroll_admin',
  second_approver_role TEXT DEFAULT 'hr_admin',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payroll approvals tracking
CREATE TABLE IF NOT EXISTS payroll_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  payroll_cycle_id UUID NOT NULL REFERENCES payroll_cycles(id),
  approval_level INTEGER NOT NULL CHECK (approval_level IN (1, 2)),
  approver_id UUID REFERENCES employees(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  remarks TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, payroll_cycle_id, approval_level)
);

-- Add approval columns to payroll_cycles
ALTER TABLE payroll_cycles ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'not_submitted'
  CHECK (approval_status IN ('not_submitted', 'pending_l1', 'pending_l2', 'approved', 'rejected'));
ALTER TABLE payroll_cycles ADD COLUMN IF NOT EXISTS submitted_for_approval_at TIMESTAMPTZ;
ALTER TABLE payroll_cycles ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES employees(id);

-- RLS
ALTER TABLE payroll_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_iso_payroll_config" ON payroll_config
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "org_iso_payroll_approvals" ON payroll_approvals
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE TRIGGER set_updated_at_payroll_config BEFORE UPDATE ON payroll_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
