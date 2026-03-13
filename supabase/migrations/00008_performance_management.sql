-- ============================================
-- Performance Management Module
-- ============================================

-- ============================================
-- Performance Cycles
-- ============================================
CREATE TABLE IF NOT EXISTS performance_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cycle_name TEXT NOT NULL,
  cycle_code TEXT NOT NULL,
  cycle_type TEXT NOT NULL CHECK (cycle_type IN ('quarterly', 'half_yearly', 'annual', 'custom')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  goal_setting_deadline DATE,
  self_review_deadline DATE,
  manager_review_deadline DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'goal_setting', 'self_review', 'manager_review', 'calibration', 'completed', 'cancelled')),
  description TEXT,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, cycle_code)
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON performance_cycles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_perf_cycles_org ON performance_cycles(organization_id, status);

-- ============================================
-- Review Competencies (Master)
-- ============================================
CREATE TABLE IF NOT EXISTS review_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  competency_name TEXT NOT NULL,
  competency_code TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'core' CHECK (category IN ('core', 'functional', 'leadership')),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, competency_code)
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON review_competencies FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Employee Goals
-- ============================================
CREATE TABLE IF NOT EXISTS employee_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  performance_cycle_id UUID NOT NULL REFERENCES performance_cycles(id) ON DELETE CASCADE,
  goal_title TEXT NOT NULL,
  goal_description TEXT,
  category TEXT NOT NULL DEFAULT 'individual' CHECK (category IN ('individual', 'team', 'organizational')),
  weightage NUMERIC(5,2) NOT NULL DEFAULT 0,
  target_value NUMERIC(12,2),
  current_value NUMERIC(12,2) DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'percentage' CHECK (unit IN ('percentage', 'number', 'currency', 'boolean')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'on_track', 'at_risk', 'completed', 'cancelled')),
  start_date DATE,
  due_date DATE,
  completed_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON employee_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_employee_goals_cycle ON employee_goals(performance_cycle_id, employee_id);
CREATE INDEX idx_employee_goals_employee ON employee_goals(employee_id, status);

-- ============================================
-- Goal Key Results
-- ============================================
CREATE TABLE IF NOT EXISTS goal_key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_goal_id UUID NOT NULL REFERENCES employee_goals(id) ON DELETE CASCADE,
  kr_title TEXT NOT NULL,
  target_value NUMERIC(12,2) NOT NULL DEFAULT 100,
  current_value NUMERIC(12,2) DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'percentage' CHECK (unit IN ('percentage', 'number', 'currency', 'boolean')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  weightage NUMERIC(5,2) DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON goal_key_results FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_goal_kr_goal ON goal_key_results(employee_goal_id);

-- ============================================
-- Goal Check-ins
-- ============================================
CREATE TABLE IF NOT EXISTS goal_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_goal_id UUID NOT NULL REFERENCES employee_goals(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  progress_value NUMERIC(12,2),
  comments TEXT,
  submitted_by UUID REFERENCES employees(id),
  reviewed_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_goal_checkins_goal ON goal_checkins(employee_goal_id, checkin_date);

-- ============================================
-- Performance Reviews
-- ============================================
CREATE TABLE IF NOT EXISTS performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  performance_cycle_id UUID NOT NULL REFERENCES performance_cycles(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES employees(id),
  overall_rating NUMERIC(3,1),
  overall_comments TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'self_review_pending', 'self_review_done', 'manager_review_pending', 'manager_review_done', 'acknowledged', 'finalized')),
  final_rating NUMERIC(3,1),
  rating_label TEXT CHECK (rating_label IN ('exceeds_expectations', 'meets_expectations', 'needs_improvement', 'below_expectations')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(performance_cycle_id, employee_id)
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON performance_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_perf_reviews_cycle ON performance_reviews(performance_cycle_id);
CREATE INDEX idx_perf_reviews_employee ON performance_reviews(employee_id);

-- ============================================
-- Self Reviews
-- ============================================
CREATE TABLE IF NOT EXISTS self_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  performance_review_id UUID NOT NULL UNIQUE REFERENCES performance_reviews(id) ON DELETE CASCADE,
  self_rating NUMERIC(3,1),
  strengths TEXT,
  areas_for_improvement TEXT,
  achievements TEXT,
  comments TEXT,
  submitted_at TIMESTAMPTZ
);

-- ============================================
-- Manager Reviews
-- ============================================
CREATE TABLE IF NOT EXISTS manager_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  performance_review_id UUID NOT NULL UNIQUE REFERENCES performance_reviews(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES employees(id),
  rating NUMERIC(3,1),
  strengths TEXT,
  areas_for_improvement TEXT,
  development_plan TEXT,
  comments TEXT,
  submitted_at TIMESTAMPTZ
);

-- ============================================
-- Performance Improvement Plans
-- ============================================
CREATE TABLE IF NOT EXISTS performance_improvement_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  performance_review_id UUID REFERENCES performance_reviews(id),
  initiated_by UUID REFERENCES employees(id),
  plan_title TEXT NOT NULL,
  objectives TEXT,
  success_criteria TEXT,
  support_resources TEXT,
  start_date DATE NOT NULL,
  target_end_date DATE NOT NULL,
  actual_end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'extended', 'completed_successful', 'completed_unsuccessful', 'cancelled')),
  progress_notes TEXT,
  outcome_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON performance_improvement_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_pip_employee ON performance_improvement_plans(employee_id, status);
CREATE INDEX idx_pip_org ON performance_improvement_plans(organization_id);

-- ============================================
-- Row Level Security Policies
-- ============================================

ALTER TABLE performance_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_improvement_plans ENABLE ROW LEVEL SECURITY;

-- Org members can read all tables
CREATE POLICY "Org members can read performance_cycles" ON performance_cycles FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members can read review_competencies" ON review_competencies FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members can read employee_goals" ON employee_goals FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members can read goal_key_results" ON goal_key_results FOR SELECT USING (
  employee_goal_id IN (SELECT id FROM employee_goals WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
);
CREATE POLICY "Org members can read goal_checkins" ON goal_checkins FOR SELECT USING (
  employee_goal_id IN (SELECT id FROM employee_goals WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
);
CREATE POLICY "Org members can read performance_reviews" ON performance_reviews FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members can read self_reviews" ON self_reviews FOR SELECT USING (
  performance_review_id IN (SELECT id FROM performance_reviews WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
);
CREATE POLICY "Org members can read manager_reviews" ON manager_reviews FOR SELECT USING (
  performance_review_id IN (SELECT id FROM performance_reviews WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
);
CREATE POLICY "Org members can read performance_improvement_plans" ON performance_improvement_plans FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- Admin/HR can manage all tables
CREATE POLICY "Admin can manage performance_cycles" ON performance_cycles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);
CREATE POLICY "Admin can manage review_competencies" ON review_competencies FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);
CREATE POLICY "Admin can manage performance_reviews" ON performance_reviews FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);
CREATE POLICY "Admin can manage performance_improvement_plans" ON performance_improvement_plans FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);

-- Employees can manage their own goals
CREATE POLICY "Employees can manage own goals" ON employee_goals FOR ALL USING (
  employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
);
CREATE POLICY "Employees can manage own goal KRs" ON goal_key_results FOR ALL USING (
  employee_goal_id IN (SELECT id FROM employee_goals WHERE employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid()))
);
CREATE POLICY "Employees can manage own checkins" ON goal_checkins FOR ALL USING (
  employee_goal_id IN (SELECT id FROM employee_goals WHERE employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid()))
);
-- Admin can also manage goals (for all employees)
CREATE POLICY "Admin can manage all goals" ON employee_goals FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);
CREATE POLICY "Admin can manage all goal KRs" ON goal_key_results FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);
CREATE POLICY "Admin can manage all checkins" ON goal_checkins FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);

-- Employees can submit their own self-reviews
CREATE POLICY "Employees can manage own self_reviews" ON self_reviews FOR ALL USING (
  performance_review_id IN (
    SELECT id FROM performance_reviews WHERE employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  )
);

-- Managers can submit manager reviews for their reports
CREATE POLICY "Managers can manage manager_reviews" ON manager_reviews FOR ALL USING (
  manager_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
);
-- Admin can also manage manager reviews
CREATE POLICY "Admin can manage all manager_reviews" ON manager_reviews FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);
