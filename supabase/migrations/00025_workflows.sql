-- ============================================================================
-- Workflows Module
-- ============================================================================

-- Workflow definitions
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('event', 'time')),
  trigger_config JSONB NOT NULL DEFAULT '{}',
  conditions JSONB DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',
  is_enabled BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow execution log
CREATE TABLE workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  affected_employee_ids UUID[] DEFAULT '{}',
  result_summary TEXT,
  error_message TEXT
);

-- Indexes
CREATE INDEX idx_workflows_org ON workflows(organization_id);
CREATE INDEX idx_workflows_enabled ON workflows(organization_id, is_enabled) WHERE is_enabled = true;
CREATE INDEX idx_workflow_runs_workflow ON workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_org ON workflow_runs(organization_id);
CREATE INDEX idx_workflow_runs_triggered ON workflow_runs(organization_id, triggered_at DESC);

-- Updated at trigger
CREATE TRIGGER workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

-- Workflows: HR/Admin/Leadership can manage
CREATE POLICY "admin_manage_workflows" ON workflows
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

-- Workflows: All org members can read (to see what automations exist)
CREATE POLICY "org_read_workflows" ON workflows
  FOR SELECT USING (organization_id = get_user_org_id());

-- Workflow runs: All org members can read (audit transparency)
CREATE POLICY "org_read_workflow_runs" ON workflow_runs
  FOR SELECT USING (organization_id = get_user_org_id());

-- Workflow runs: System inserts (via HR/Admin when evaluating)
CREATE POLICY "admin_insert_workflow_runs" ON workflow_runs
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );
