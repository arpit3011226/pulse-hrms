-- ============================================================================
-- F30, F31, F34, F46 — helpdesk, travel, recognition, policy acknowledgement
-- ============================================================================

-- ── F30: HR helpdesk ────────────────────────────────────────────────────────
-- general_requests exists but is a flat list: no categories, no SLA, no
-- routing, no escalation. A ticket needs all four to stop things being lost.

CREATE TABLE IF NOT EXISTS helpdesk_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- Who picks this up by default
  default_assignee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  -- Hours to first response and to resolution
  response_sla_hours INTEGER DEFAULT 24,
  resolution_sla_hours INTEGER DEFAULT 72,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS helpdesk_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL,
  category_id UUID REFERENCES helpdesk_categories(id) ON DELETE SET NULL,
  raised_by UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,

  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'waiting_on_employee', 'resolved', 'closed', 'cancelled')),

  -- Deadlines are stamped when the ticket is raised, from the category's SLA,
  -- so changing the SLA later does not silently move an existing deadline.
  response_due_at TIMESTAMPTZ,
  resolution_due_at TIMESTAMPTZ,
  first_responded_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  escalated BOOLEAN DEFAULT false,
  escalated_at TIMESTAMPTZ,
  escalated_to UUID REFERENCES employees(id) ON DELETE SET NULL,

  resolution_notes TEXT,
  satisfaction_rating INTEGER CHECK (satisfaction_rating IS NULL OR (satisfaction_rating BETWEEN 1 AND 5)),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, ticket_number)
);

CREATE TABLE IF NOT EXISTS helpdesk_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES helpdesk_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  -- An internal note is for the HR team, not the person who raised it
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_org      ON helpdesk_tickets(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_raiser   ON helpdesk_tickets(raised_by);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON helpdesk_tickets(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_tickets_overdue
  ON helpdesk_tickets(organization_id, resolution_due_at)
  WHERE status IN ('open', 'in_progress', 'waiting_on_employee');
CREATE INDEX IF NOT EXISTS idx_ticket_comments  ON helpdesk_comments(ticket_id);

CREATE OR REPLACE TRIGGER set_tickets_updated_at
  BEFORE UPDATE ON helpdesk_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── F31: travel request and advance ─────────────────────────────────────────
-- Reimbursement covers money already spent. This covers asking BEFORE the trip,
-- and the advance that often goes with it.

CREATE TABLE IF NOT EXISTS travel_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  request_number TEXT NOT NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  purpose TEXT NOT NULL,
  travel_type TEXT NOT NULL DEFAULT 'domestic'
    CHECK (travel_type IN ('domestic', 'international', 'local')),
  from_location TEXT,
  to_location TEXT NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE,

  estimated_travel_cost NUMERIC(12,2) DEFAULT 0,
  estimated_stay_cost   NUMERIC(12,2) DEFAULT 0,
  estimated_other_cost  NUMERIC(12,2) DEFAULT 0,
  advance_requested     NUMERIC(12,2) DEFAULT 0,
  advance_paid          NUMERIC(12,2) DEFAULT 0,
  advance_settled       NUMERIC(12,2) DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_manager', 'pending_finance', 'approved',
                      'rejected', 'cancelled', 'completed')),
  manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  manager_approved_at TIMESTAMPTZ,
  manager_remarks TEXT,
  finance_approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  finance_approved_at TIMESTAMPTZ,
  finance_remarks TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT travel_dates CHECK (return_date IS NULL OR return_date >= departure_date),
  UNIQUE (organization_id, request_number)
);

CREATE INDEX IF NOT EXISTS idx_travel_org    ON travel_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_travel_emp    ON travel_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_travel_mgr    ON travel_requests(manager_id, status);

CREATE OR REPLACE TRIGGER set_travel_updated_at
  BEFORE UPDATE ON travel_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── F34: recognition ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recognition_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS recognitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  given_by UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  given_to UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  value_id UUID REFERENCES recognition_values(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT no_self_recognition CHECK (given_by <> given_to)
);

CREATE INDEX IF NOT EXISTS idx_recognitions_org  ON recognitions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recognitions_to   ON recognitions(given_to);
CREATE INDEX IF NOT EXISTS idx_recognitions_from ON recognitions(given_by);

-- ── F46: policy acknowledgement ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS company_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  version TEXT DEFAULT '1.0',
  content TEXT,
  document_url TEXT,
  effective_from DATE DEFAULT CURRENT_DATE,
  requires_acknowledgement BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policy_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES company_policies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  -- The version acknowledged is recorded, so re-issuing a policy asks again
  policy_version TEXT,
  acknowledged_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (policy_id, employee_id, policy_version)
);

CREATE INDEX IF NOT EXISTS idx_policies_org ON company_policies(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_policy_ack_emp ON policy_acknowledgements(employee_id);

CREATE OR REPLACE TRIGGER set_policies_updated_at
  BEFORE UPDATE ON company_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE helpdesk_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE helpdesk_tickets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE helpdesk_comments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE recognition_values       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recognitions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_policies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_acknowledgements  ENABLE ROW LEVEL SECURITY;

-- Helpdesk categories: everyone reads (to raise a ticket), HR manages.
CREATE POLICY "org_read_helpdesk_categories" ON helpdesk_categories
  FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "hr_manages_helpdesk_categories" ON helpdesk_categories
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

-- A ticket is visible to the person who raised it, whoever it is assigned to,
-- and HR. Not to the whole company — tickets contain personal problems.
CREATE POLICY "read_own_assigned_or_hr_tickets" ON helpdesk_tickets
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      raised_by   IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR assigned_to IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR escalated_to IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );
CREATE POLICY "raise_own_ticket" ON helpdesk_tickets
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND raised_by IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );
CREATE POLICY "assignee_updates_ticket" ON helpdesk_tickets
  FOR UPDATE USING (
    organization_id = get_user_org_id()
    AND (
      assigned_to IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR raised_by IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    )
  );
CREATE POLICY "hr_manages_tickets" ON helpdesk_tickets
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

-- Comments follow the ticket. Internal notes are hidden from the raiser.
CREATE POLICY "read_ticket_comments" ON helpdesk_comments
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND ticket_id IN (SELECT id FROM helpdesk_tickets)
    AND (
      is_internal = false
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
      OR author_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    )
  );
CREATE POLICY "write_ticket_comments" ON helpdesk_comments
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND author_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

-- Travel: own, the approving manager, finance and HR.
CREATE POLICY "read_own_or_approving_travel" ON travel_requests
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR manager_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin', 'leadership')
    )
  );
CREATE POLICY "manage_own_travel" ON travel_requests
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );
CREATE POLICY "approver_updates_travel" ON travel_requests
  FOR UPDATE USING (
    organization_id = get_user_org_id()
    AND (
      manager_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin', 'leadership')
    )
  );

-- Recognition is meant to be seen.
CREATE POLICY "org_read_recognition_values" ON recognition_values
  FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "hr_manages_recognition_values" ON recognition_values
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

CREATE POLICY "org_read_recognitions" ON recognitions
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      is_public = true
      OR given_to IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR given_by IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );
CREATE POLICY "give_own_recognition" ON recognitions
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND given_by IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );
CREATE POLICY "hr_manages_recognitions" ON recognitions
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

-- Policies: everyone reads active ones, HR manages.
CREATE POLICY "org_read_policies" ON company_policies
  FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "hr_manages_policies" ON company_policies
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

-- You record your own acknowledgement; HR can see who has and has not.
CREATE POLICY "read_own_or_hr_acknowledgements" ON policy_acknowledgements
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );
CREATE POLICY "acknowledge_own_policy" ON policy_acknowledgements
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );
