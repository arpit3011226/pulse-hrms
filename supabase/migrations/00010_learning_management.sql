-- ============================================
-- Learning & Development Module
-- ============================================

-- ============================================
-- Course Categories (Master Data)
-- ============================================
CREATE TABLE IF NOT EXISTS course_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, category_name)
);

CREATE TRIGGER set_updated_at_course_categories BEFORE UPDATE ON course_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Training Courses
-- ============================================
CREATE TABLE IF NOT EXISTS training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_code TEXT NOT NULL,
  course_name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES course_categories(id),
  mode TEXT NOT NULL DEFAULT 'online' CHECK (mode IN ('online', 'classroom', 'blended', 'self_paced')),
  duration_hours NUMERIC(6,1),
  instructor_name TEXT,
  max_participants INTEGER,
  thumbnail_url TEXT,
  syllabus TEXT,
  prerequisites TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_mandatory BOOLEAN DEFAULT false,
  target_departments UUID[],
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, course_code)
);

CREATE TRIGGER set_updated_at_training_courses BEFORE UPDATE ON training_courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_training_courses_org ON training_courses(organization_id, status);
CREATE INDEX idx_training_courses_category ON training_courses(category_id);

-- ============================================
-- Training Enrollments
-- ============================================
CREATE TABLE IF NOT EXISTS training_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  enrolled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completion_date DATE,
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'in_progress', 'completed', 'dropped', 'failed')),
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  certificate_url TEXT,
  feedback_rating NUMERIC(3,1) CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_comments TEXT,
  enrolled_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, employee_id)
);

CREATE TRIGGER set_updated_at_training_enrollments BEFORE UPDATE ON training_enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_enrollments_org ON training_enrollments(organization_id, status);
CREATE INDEX idx_enrollments_course ON training_enrollments(course_id);
CREATE INDEX idx_enrollments_employee ON training_enrollments(employee_id);

-- ============================================
-- Training Assessments
-- ============================================
CREATE TABLE IF NOT EXISTS training_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  assessment_name TEXT NOT NULL,
  assessment_type TEXT NOT NULL DEFAULT 'quiz' CHECK (assessment_type IN ('quiz', 'assignment', 'practical', 'certification_exam')),
  total_marks INTEGER NOT NULL DEFAULT 100,
  passing_marks INTEGER NOT NULL DEFAULT 40,
  duration_minutes INTEGER,
  is_mandatory BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at_training_assessments BEFORE UPDATE ON training_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_assessments_course ON training_assessments(course_id);

-- ============================================
-- Training Assessment Attempts
-- ============================================
CREATE TABLE IF NOT EXISTS training_assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES training_assessments(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  score NUMERIC(6,2),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'passed', 'failed')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assessment_id, employee_id, attempt_number)
);

CREATE INDEX idx_attempts_assessment ON training_assessment_attempts(assessment_id);
CREATE INDEX idx_attempts_employee ON training_assessment_attempts(employee_id);

-- ============================================
-- Row Level Security Policies
-- ============================================

ALTER TABLE course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_assessment_attempts ENABLE ROW LEVEL SECURITY;

-- Org members can read categories and courses
CREATE POLICY "Org members can read course_categories" ON course_categories FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members can read training_courses" ON training_courses FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members can read training_enrollments" ON training_enrollments FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members can read training_assessments" ON training_assessments FOR SELECT USING (
  course_id IN (SELECT id FROM training_courses WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
);
CREATE POLICY "Org members can read training_assessment_attempts" ON training_assessment_attempts FOR SELECT USING (
  assessment_id IN (SELECT id FROM training_assessments WHERE course_id IN (SELECT id FROM training_courses WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())))
);

-- Admin/HR can manage all L&D tables
CREATE POLICY "Admin can manage course_categories" ON course_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);
CREATE POLICY "Admin can manage training_courses" ON training_courses FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);
CREATE POLICY "Admin can manage training_enrollments" ON training_enrollments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);
CREATE POLICY "Admin can manage training_assessments" ON training_assessments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);
CREATE POLICY "Admin can manage training_assessment_attempts" ON training_assessment_attempts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);

-- Employees can manage their own enrollment feedback
CREATE POLICY "Employees can update own enrollment feedback" ON training_enrollments FOR UPDATE USING (
  employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
) WITH CHECK (
  employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
);

-- Employees can manage their own assessment attempts
CREATE POLICY "Employees can manage own attempts" ON training_assessment_attempts FOR ALL USING (
  employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
);
