-- ============================================================================
-- F22–F28 — Onboarding
--
-- The join between Hire and the employee lifecycle. A new joiner has work to
-- do, and so do HR, IT, Admin, their manager and their buddy — spread from
-- before day one to a year in.
--
-- Shape:
--   onboarding_templates       reusable plans ("Engineering full-time")
--     onboarding_template_tasks  the tasks in a plan, dated relative to joining
--   employee_onboarding        one run per new joiner
--     onboarding_tasks           the real tasks, with real dates and owners
--     onboarding_journeys        30/60/90/180/365 check-ins
--
-- Tasks are COPIED from the template when a run starts, not referenced. Editing
-- a template later must not rewrite the plan of someone already halfway through.
-- ============================================================================

-- ── Templates ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- Optional narrowing; null means it can apply to anyone
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  employment_type TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS onboarding_template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES onboarding_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'day_1'
    CHECK (category IN ('pre_joining', 'day_1', 'week_1', 'month_1', 'ongoing')),
  owner_role TEXT NOT NULL DEFAULT 'hr'
    CHECK (owner_role IN ('hr', 'it', 'admin', 'manager', 'buddy', 'employee', 'finance')),
  -- Days relative to the joining date. Negative means before they join.
  due_offset_days INTEGER NOT NULL DEFAULT 0,
  is_mandatory BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── A run, per new joiner ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS employee_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  template_id UUID REFERENCES onboarding_templates(id) ON DELETE SET NULL,
  joining_date DATE NOT NULL,
  buddy_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- One onboarding per person
  UNIQUE (employee_id)
);

CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_onboarding_id UUID NOT NULL REFERENCES employee_onboarding(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'day_1'
    CHECK (category IN ('pre_joining', 'day_1', 'week_1', 'month_1', 'ongoing')),
  owner_role TEXT NOT NULL DEFAULT 'hr'
    CHECK (owner_role IN ('hr', 'it', 'admin', 'manager', 'buddy', 'employee', 'finance')),
  -- Resolved owner where we can work it out (manager, buddy, the joiner)
  assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'skipped')),
  is_mandatory BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  completed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 30 / 60 / 90 / 180 / 365 ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS onboarding_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_onboarding_id UUID NOT NULL REFERENCES employee_onboarding(id) ON DELETE CASCADE,
  milestone_days INTEGER NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'skipped')),
  -- Optional survey sent at this milestone
  survey_id UUID REFERENCES surveys(id) ON DELETE SET NULL,
  manager_notes TEXT,
  employee_notes TEXT,
  completed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (employee_onboarding_id, milestone_days)
);

-- ── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_onb_templates_org      ON onboarding_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_onb_template_tasks_tpl ON onboarding_template_tasks(template_id);
CREATE INDEX IF NOT EXISTS idx_emp_onboarding_org     ON employee_onboarding(organization_id);
CREATE INDEX IF NOT EXISTS idx_emp_onboarding_emp     ON employee_onboarding(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_onboarding_status  ON employee_onboarding(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_onb_tasks_run          ON onboarding_tasks(employee_onboarding_id);
CREATE INDEX IF NOT EXISTS idx_onb_tasks_assignee     ON onboarding_tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_onb_tasks_due          ON onboarding_tasks(organization_id, due_date)
  WHERE status IN ('pending', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_onb_journeys_run       ON onboarding_journeys(employee_onboarding_id);
CREATE INDEX IF NOT EXISTS idx_onb_journeys_due       ON onboarding_journeys(organization_id, due_date)
  WHERE status = 'pending';

-- ── Updated-at triggers ─────────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER set_onb_templates_updated_at
  BEFORE UPDATE ON onboarding_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER set_emp_onboarding_updated_at
  BEFORE UPDATE ON employee_onboarding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER set_onb_tasks_updated_at
  BEFORE UPDATE ON onboarding_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER set_onb_journeys_updated_at
  BEFORE UPDATE ON onboarding_journeys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE onboarding_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_onboarding       ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_journeys       ENABLE ROW LEVEL SECURITY;

-- Templates: everyone in the org can read, HR and admins manage.
DROP POLICY IF EXISTS "org_read_onb_templates" ON onboarding_templates;
CREATE POLICY "org_read_onb_templates" ON onboarding_templates
  FOR SELECT USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "admin_manage_onb_templates" ON onboarding_templates;
CREATE POLICY "admin_manage_onb_templates" ON onboarding_templates
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

DROP POLICY IF EXISTS "org_read_onb_template_tasks" ON onboarding_template_tasks;
CREATE POLICY "org_read_onb_template_tasks" ON onboarding_template_tasks
  FOR SELECT USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "admin_manage_onb_template_tasks" ON onboarding_template_tasks;
CREATE POLICY "admin_manage_onb_template_tasks" ON onboarding_template_tasks
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

-- A run is visible to the joiner, their manager, their buddy, and HR.
DROP POLICY IF EXISTS "read_emp_onboarding" ON employee_onboarding;
CREATE POLICY "read_emp_onboarding" ON employee_onboarding
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR buddy_id  IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR employee_id IN (
        SELECT e.id FROM employees e
        WHERE e.reporting_manager_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      )
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS "admin_manage_emp_onboarding" ON employee_onboarding;
CREATE POLICY "admin_manage_emp_onboarding" ON employee_onboarding
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

-- Tasks follow their run, and whoever a task is assigned to can act on it.
DROP POLICY IF EXISTS "read_onb_tasks" ON onboarding_tasks;
CREATE POLICY "read_onb_tasks" ON onboarding_tasks
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      assigned_to IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR employee_onboarding_id IN (SELECT id FROM employee_onboarding)
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS "assignee_updates_onb_task" ON onboarding_tasks;
CREATE POLICY "assignee_updates_onb_task" ON onboarding_tasks
  FOR UPDATE USING (
    organization_id = get_user_org_id()
    AND assigned_to IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_manage_onb_tasks" ON onboarding_tasks;
CREATE POLICY "admin_manage_onb_tasks" ON onboarding_tasks
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

DROP POLICY IF EXISTS "read_onb_journeys" ON onboarding_journeys;
CREATE POLICY "read_onb_journeys" ON onboarding_journeys
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND employee_onboarding_id IN (SELECT id FROM employee_onboarding)
  );

DROP POLICY IF EXISTS "admin_manage_onb_journeys" ON onboarding_journeys;
CREATE POLICY "admin_manage_onb_journeys" ON onboarding_journeys
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership', 'manager')
  );
