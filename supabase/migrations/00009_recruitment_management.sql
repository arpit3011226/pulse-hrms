-- ============================================
-- Recruitment & Applicant Tracking Module
-- ============================================

-- ============================================
-- Interview Stages (Master Data)
-- ============================================
CREATE TABLE IF NOT EXISTS interview_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, stage_name)
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON interview_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Job Requisitions
-- ============================================
CREATE TABLE IF NOT EXISTS job_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requisition_code TEXT NOT NULL,
  title TEXT NOT NULL,
  department_id UUID REFERENCES departments(id),
  hiring_manager_id UUID REFERENCES employees(id),
  employment_type TEXT NOT NULL DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern')),
  headcount INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  requirements TEXT,
  min_experience INTEGER,
  max_experience INTEGER,
  min_salary NUMERIC(12,2),
  max_salary NUMERIC(12,2),
  location TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'on_hold', 'closed', 'filled', 'cancelled')),
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, requisition_code)
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON job_requisitions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_job_req_org ON job_requisitions(organization_id, status);
CREATE INDEX idx_job_req_dept ON job_requisitions(department_id);

-- ============================================
-- Candidates
-- ============================================
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  current_company TEXT,
  current_designation TEXT,
  experience_years NUMERIC(4,1),
  source TEXT NOT NULL DEFAULT 'direct' CHECK (source IN ('job_portal', 'referral', 'direct', 'linkedin', 'agency', 'campus', 'other')),
  resume_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, email)
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_candidates_org ON candidates(organization_id);

-- ============================================
-- Candidate Applications
-- ============================================
CREATE TABLE IF NOT EXISTS candidate_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_requisition_id UUID NOT NULL REFERENCES job_requisitions(id) ON DELETE CASCADE,
  current_stage_id UUID REFERENCES interview_stages(id),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'screening', 'in_progress', 'offer', 'hired', 'rejected', 'withdrawn', 'on_hold')),
  applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(candidate_id, job_requisition_id)
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON candidate_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_applications_org ON candidate_applications(organization_id, status);
CREATE INDEX idx_applications_req ON candidate_applications(job_requisition_id, status);
CREATE INDEX idx_applications_candidate ON candidate_applications(candidate_id);

-- ============================================
-- Candidate Stage History
-- ============================================
CREATE TABLE IF NOT EXISTS candidate_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_application_id UUID NOT NULL REFERENCES candidate_applications(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES interview_stages(id),
  to_stage_id UUID NOT NULL REFERENCES interview_stages(id),
  moved_by UUID REFERENCES employees(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stage_history_app ON candidate_stage_history(candidate_application_id);

-- ============================================
-- Interviews
-- ============================================
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  candidate_application_id UUID NOT NULL REFERENCES candidate_applications(id) ON DELETE CASCADE,
  interview_stage_id UUID REFERENCES interview_stages(id),
  interviewer_id UUID REFERENCES employees(id),
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  mode TEXT NOT NULL DEFAULT 'video' CHECK (mode IN ('phone', 'video', 'in_person')),
  location_or_link TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON interviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_interviews_org ON interviews(organization_id, status);
CREATE INDEX idx_interviews_app ON interviews(candidate_application_id);
CREATE INDEX idx_interviews_interviewer ON interviews(interviewer_id, scheduled_start);

-- ============================================
-- Interview Feedback
-- ============================================
CREATE TABLE IF NOT EXISTS interview_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL UNIQUE REFERENCES interviews(id) ON DELETE CASCADE,
  interviewer_id UUID NOT NULL REFERENCES employees(id),
  rating NUMERIC(3,1) CHECK (rating >= 1 AND rating <= 5),
  strengths TEXT,
  areas_for_improvement TEXT,
  recommendation TEXT NOT NULL CHECK (recommendation IN ('strong_hire', 'hire', 'maybe', 'no_hire', 'strong_no_hire')),
  comments TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Offer Letters
-- ============================================
CREATE TABLE IF NOT EXISTS offer_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  candidate_application_id UUID NOT NULL UNIQUE REFERENCES candidate_applications(id) ON DELETE CASCADE,
  offered_designation TEXT NOT NULL,
  offered_ctc NUMERIC(12,2) NOT NULL,
  joining_date DATE,
  offer_status TEXT NOT NULL DEFAULT 'draft' CHECK (offer_status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'withdrawn')),
  offer_notes TEXT,
  valid_until DATE,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON offer_letters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_offers_org ON offer_letters(organization_id, offer_status);

-- ============================================
-- Candidate Conversion Records
-- ============================================
CREATE TABLE IF NOT EXISTS candidate_conversion_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_application_id UUID NOT NULL UNIQUE REFERENCES candidate_applications(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  conversion_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Row Level Security Policies
-- ============================================

ALTER TABLE interview_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_conversion_records ENABLE ROW LEVEL SECURITY;

-- Org members can read all tables with organization_id
CREATE POLICY "Org members can read interview_stages" ON interview_stages FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members can read job_requisitions" ON job_requisitions FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members can read candidates" ON candidates FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members can read candidate_applications" ON candidate_applications FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members can read candidate_stage_history" ON candidate_stage_history FOR SELECT USING (
  candidate_application_id IN (SELECT id FROM candidate_applications WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
);
CREATE POLICY "Org members can read interviews" ON interviews FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members can read interview_feedback" ON interview_feedback FOR SELECT USING (
  interview_id IN (SELECT id FROM interviews WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
);
CREATE POLICY "Org members can read offer_letters" ON offer_letters FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members can read candidate_conversion_records" ON candidate_conversion_records FOR SELECT USING (
  candidate_application_id IN (SELECT id FROM candidate_applications WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
);

-- Admin/HR can manage all recruitment tables
CREATE POLICY "Admin can manage interview_stages" ON interview_stages FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);
CREATE POLICY "Admin can manage job_requisitions" ON job_requisitions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);
CREATE POLICY "Admin can manage candidates" ON candidates FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);
CREATE POLICY "Admin can manage candidate_applications" ON candidate_applications FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);
CREATE POLICY "Admin can manage candidate_stage_history" ON candidate_stage_history FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);
CREATE POLICY "Admin can manage interviews" ON interviews FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);
CREATE POLICY "Admin can manage interview_feedback" ON interview_feedback FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);
CREATE POLICY "Admin can manage offer_letters" ON offer_letters FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);
CREATE POLICY "Admin can manage candidate_conversion_records" ON candidate_conversion_records FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
);

-- Interviewers can submit their own feedback
CREATE POLICY "Interviewers can manage own feedback" ON interview_feedback FOR ALL USING (
  interviewer_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
);
