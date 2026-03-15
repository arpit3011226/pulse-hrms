-- ============================================================================
-- Surveys Module (Sentiment Analytics)
-- ============================================================================

-- Survey definitions
CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  target_rules JSONB DEFAULT '[]',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Survey questions
CREATE TABLE survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('work_life_balance', 'career_growth', 'manager_support', 'compensation', 'team_culture', 'custom')),
  question_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Survey responses (one per employee per survey)
CREATE TABLE survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  is_anonymous BOOLEAN DEFAULT false,
  UNIQUE(survey_id, employee_id)
);

-- Survey answers (one per question per response)
CREATE TABLE survey_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  UNIQUE(response_id, question_id)
);

-- Indexes
CREATE INDEX idx_surveys_org ON surveys(organization_id);
CREATE INDEX idx_surveys_org_status ON surveys(organization_id, status);
CREATE INDEX idx_survey_questions_survey ON survey_questions(survey_id, question_order);
CREATE INDEX idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX idx_survey_responses_employee ON survey_responses(employee_id);
CREATE INDEX idx_survey_answers_response ON survey_answers(response_id);
CREATE INDEX idx_survey_answers_question ON survey_answers(question_id);

-- Updated at trigger for surveys
CREATE TRIGGER surveys_updated_at
  BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_answers ENABLE ROW LEVEL SECURITY;

-- Surveys: Admin/HR can manage (CRUD)
CREATE POLICY "admin_manage_surveys" ON surveys
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

-- Surveys: All org members can read active surveys
CREATE POLICY "org_read_active_surveys" ON surveys
  FOR SELECT USING (
    organization_id = get_user_org_id()
  );

-- Survey Questions: Admin/HR can manage
CREATE POLICY "admin_manage_survey_questions" ON survey_questions
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

-- Survey Questions: All org members can read
CREATE POLICY "org_read_survey_questions" ON survey_questions
  FOR SELECT USING (
    organization_id = get_user_org_id()
  );

-- Survey Responses: Admin/HR can read all
CREATE POLICY "admin_read_survey_responses" ON survey_responses
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

-- Survey Responses: Employees can insert and read their own
CREATE POLICY "employee_manage_own_response" ON survey_responses
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

-- Survey Answers: Admin/HR can read all
CREATE POLICY "admin_read_survey_answers" ON survey_answers
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

-- Survey Answers: Employees can insert and read their own
CREATE POLICY "employee_manage_own_answers" ON survey_answers
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND response_id IN (
      SELECT id FROM survey_responses
      WHERE employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    )
  );
