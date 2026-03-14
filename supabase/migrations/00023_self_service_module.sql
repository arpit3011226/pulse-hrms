-- ============================================================
-- 00023: Self-Service Module — Letter Templates & Requests
-- ============================================================

-- ── Letter Templates ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS letter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'experience_letter', 'salary_certificate', 'address_proof', 'bonafide_certificate',
    'relieving_letter', 'noc', 'reference_letter',
    'offer_letter', 'appointment_letter', 'confirmation_letter',
    'warning_letter', 'termination_letter', 'salary_revision_letter'
  )),
  description TEXT,
  body_html TEXT NOT NULL,
  approval_type TEXT NOT NULL DEFAULT 'auto' CHECK (approval_type IN ('auto', 'approval_required', 'hr_only')),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_letter_templates_org ON letter_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_letter_templates_category ON letter_templates(organization_id, category);

ALTER TABLE letter_templates ENABLE ROW LEVEL SECURITY;

-- HR/Admin full CRUD
CREATE POLICY "admin_manage_letter_templates"
  ON letter_templates FOR ALL TO authenticated
  USING (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin'))
  WITH CHECK (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin'));

-- All org members can read active templates
CREATE POLICY "org_read_active_letter_templates"
  ON letter_templates FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id() AND is_active = true);


-- ── Letter Requests ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS letter_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES letter_templates(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  requested_by UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_manager', 'manager_approved', 'manager_rejected',
    'pending_hr', 'hr_approved', 'hr_rejected', 'completed', 'cancelled'
  )),
  -- Approval tracking
  manager_approved_by UUID REFERENCES employees(id),
  manager_approved_at TIMESTAMPTZ,
  manager_remarks TEXT,
  hr_approved_by UUID REFERENCES employees(id),
  hr_approved_at TIMESTAMPTZ,
  hr_remarks TEXT,
  -- Generated output
  generated_pdf_url TEXT,
  resolved_body_html TEXT,
  custom_fields JSONB DEFAULT '{}',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_letter_requests_org ON letter_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_letter_requests_employee ON letter_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_letter_requests_status ON letter_requests(organization_id, status);

ALTER TABLE letter_requests ENABLE ROW LEVEL SECURITY;

-- Employee can manage own requests
CREATE POLICY "employee_manage_own_letter_requests"
  ON letter_requests FOR ALL TO authenticated
  USING (
    organization_id = get_user_org_id()
    AND employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  )
  WITH CHECK (
    organization_id = get_user_org_id()
    AND employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

-- Manager can read and update direct reports' requests
CREATE POLICY "manager_handle_letter_requests"
  ON letter_requests FOR SELECT TO authenticated
  USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('manager', 'leadership')
    AND employee_id IN (
      SELECT id FROM employees WHERE reporting_manager_id IN (
        SELECT id FROM employees WHERE profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "manager_update_letter_requests"
  ON letter_requests FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('manager', 'leadership')
    AND employee_id IN (
      SELECT id FROM employees WHERE reporting_manager_id IN (
        SELECT id FROM employees WHERE profile_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    organization_id = get_user_org_id()
  );

-- HR/Admin full access
CREATE POLICY "admin_manage_letter_requests"
  ON letter_requests FOR ALL TO authenticated
  USING (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin'))
  WITH CHECK (organization_id = get_user_org_id() AND get_user_role() IN ('super_admin', 'hr_admin'));


-- ── Updated-at triggers ─────────────────────────────────────

CREATE TRIGGER set_letter_templates_updated_at
  BEFORE UPDATE ON letter_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_letter_requests_updated_at
  BEFORE UPDATE ON letter_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
