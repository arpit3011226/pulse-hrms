-- ============================================================
-- 00024: Reimbursement Requests & General Requests
-- ============================================================

-- ── Reimbursement Requests ────────────────────────────────────

CREATE TABLE IF NOT EXISTS reimbursement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  requested_by UUID NOT NULL REFERENCES profiles(id),

  category TEXT NOT NULL CHECK (category IN (
    'travel', 'medical', 'mobile_internet', 'relocation', 'training', 'meal_food'
  )),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  expense_date DATE NOT NULL,
  receipt_url TEXT,

  status TEXT NOT NULL DEFAULT 'pending_manager' CHECK (status IN (
    'draft', 'pending_manager', 'manager_approved', 'manager_rejected',
    'pending_finance', 'finance_approved', 'finance_rejected', 'completed', 'cancelled'
  )),

  -- Manager approval tracking
  manager_approved_by UUID REFERENCES employees(id),
  manager_approved_at TIMESTAMPTZ,
  manager_remarks TEXT,

  -- Finance/Payroll approval tracking
  finance_approved_by UUID REFERENCES employees(id),
  finance_approved_at TIMESTAMPTZ,
  finance_remarks TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reimbursement_requests_org ON reimbursement_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_reimbursement_requests_employee ON reimbursement_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_reimbursement_requests_status ON reimbursement_requests(organization_id, status);

ALTER TABLE reimbursement_requests ENABLE ROW LEVEL SECURITY;

-- Employee can manage own reimbursements
CREATE POLICY "employee_manage_own_reimbursements"
  ON reimbursement_requests FOR ALL TO authenticated
  USING (
    organization_id = get_user_org_id()
    AND employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  )
  WITH CHECK (
    organization_id = get_user_org_id()
    AND employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

-- Manager can read direct reports' reimbursements
CREATE POLICY "manager_read_reimbursements"
  ON reimbursement_requests FOR SELECT TO authenticated
  USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('manager', 'leadership')
    AND employee_id IN (
      SELECT id FROM employees WHERE reporting_manager_id IN (
        SELECT id FROM employees WHERE profile_id = auth.uid()
      )
    )
  );

-- Manager can update direct reports' reimbursements
CREATE POLICY "manager_update_reimbursements"
  ON reimbursement_requests FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('manager', 'leadership')
    AND employee_id IN (
      SELECT id FROM employees WHERE reporting_manager_id IN (
        SELECT id FROM employees WHERE profile_id = auth.uid()
      )
    )
  )
  WITH CHECK (organization_id = get_user_org_id());

-- Admin/HR/Finance full access
CREATE POLICY "admin_manage_reimbursements"
  ON reimbursement_requests FOR ALL TO authenticated
  USING (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin'))
  WITH CHECK (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin'));


-- ── General Requests ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS general_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  requested_by UUID NOT NULL REFERENCES profiles(id),

  request_type TEXT NOT NULL CHECK (request_type IN (
    'id_card_request', 'asset_request', 'wfh_request', 'shift_change_request', 'overtime_request'
  )),
  title TEXT NOT NULL,
  description TEXT,
  custom_fields JSONB DEFAULT '{}',

  status TEXT NOT NULL DEFAULT 'pending_manager' CHECK (status IN (
    'pending_manager', 'manager_approved', 'manager_rejected',
    'pending_hr', 'hr_approved', 'hr_rejected', 'completed', 'cancelled'
  )),

  -- Manager approval tracking
  manager_approved_by UUID REFERENCES employees(id),
  manager_approved_at TIMESTAMPTZ,
  manager_remarks TEXT,

  -- HR approval tracking (used for asset_request)
  hr_approved_by UUID REFERENCES employees(id),
  hr_approved_at TIMESTAMPTZ,
  hr_remarks TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_general_requests_org ON general_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_general_requests_employee ON general_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_general_requests_status ON general_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_general_requests_type ON general_requests(organization_id, request_type);

ALTER TABLE general_requests ENABLE ROW LEVEL SECURITY;

-- Employee can manage own general requests
CREATE POLICY "employee_manage_own_general_requests"
  ON general_requests FOR ALL TO authenticated
  USING (
    organization_id = get_user_org_id()
    AND employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  )
  WITH CHECK (
    organization_id = get_user_org_id()
    AND employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

-- Manager can read direct reports' general requests
CREATE POLICY "manager_read_general_requests"
  ON general_requests FOR SELECT TO authenticated
  USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('manager', 'leadership')
    AND employee_id IN (
      SELECT id FROM employees WHERE reporting_manager_id IN (
        SELECT id FROM employees WHERE profile_id = auth.uid()
      )
    )
  );

-- Manager can update direct reports' general requests
CREATE POLICY "manager_update_general_requests"
  ON general_requests FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('manager', 'leadership')
    AND employee_id IN (
      SELECT id FROM employees WHERE reporting_manager_id IN (
        SELECT id FROM employees WHERE profile_id = auth.uid()
      )
    )
  )
  WITH CHECK (organization_id = get_user_org_id());

-- HR/Admin full access
CREATE POLICY "admin_manage_general_requests"
  ON general_requests FOR ALL TO authenticated
  USING (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin'))
  WITH CHECK (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin'));


-- ── Updated-at triggers ──────────────────────────────────────

CREATE TRIGGER set_reimbursement_requests_updated_at
  BEFORE UPDATE ON reimbursement_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_general_requests_updated_at
  BEFORE UPDATE ON general_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── Storage bucket for reimbursement receipts ────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('reimbursement-receipts', 'reimbursement-receipts', true)
ON CONFLICT DO NOTHING;

-- Storage policies for reimbursement receipts
CREATE POLICY "auth_upload_reimbursement_receipts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reimbursement-receipts');

CREATE POLICY "auth_read_reimbursement_receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'reimbursement-receipts');

CREATE POLICY "auth_update_reimbursement_receipts" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'reimbursement-receipts');

CREATE POLICY "auth_delete_reimbursement_receipts" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'reimbursement-receipts');
