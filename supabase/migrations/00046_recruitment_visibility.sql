-- Who can see what during and after hiring.
--
-- Before this: "Org members can read candidates" and "Org members can read
-- interviews" meant every one of the fifty employees could read the whole
-- pipeline — names, phone numbers, CVs, interviewer notes and rejection
-- reasons — and see who was being interviewed for what. Job requisitions were
-- org-wide too, and they carry the salary band and the budget.
--
-- The rule now:
--   * HR, admin and leadership see the pipeline, because running it is their job.
--   * The hiring manager sees the candidates for their own requisitions.
--   * An interviewer sees a candidate only while that application is still open,
--     and only if they are on the panel. Once the person is hired, rejected or
--     has withdrawn, the interviewer keeps their own interviews and their own
--     feedback and loses the candidate's contact details and CV.
--   * The candidate sees their own record.
--   * Nobody else sees anything.

-- ── Helpers ─────────────────────────────────────────────────────────────────

-- Applications that are still live. Once an application leaves this set the
-- panel's view of the candidate closes.
CREATE OR REPLACE FUNCTION application_is_open(p_status TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status IN ('new', 'screening', 'in_progress', 'offer', 'on_hold');
$$;

-- Am I on the panel for a still-open application from this candidate?
CREATE OR REPLACE FUNCTION interviews_open_candidate(p_candidate_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM interviews i
    JOIN candidate_applications ca ON ca.id = i.candidate_application_id
    WHERE ca.candidate_id = p_candidate_id
      AND application_is_open(ca.status)
      AND i.interviewer_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );
$$;

-- Am I the hiring manager for the requisition this application belongs to?
CREATE OR REPLACE FUNCTION manages_hiring_for_candidate(p_candidate_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM candidate_applications ca
    JOIN job_requisitions jr ON jr.id = ca.job_requisition_id
    WHERE ca.candidate_id = p_candidate_id
      AND jr.hiring_manager_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION manages_hiring_for_application(p_application_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM candidate_applications ca
    JOIN job_requisitions jr ON jr.id = ca.job_requisition_id
    WHERE ca.id = p_application_id
      AND jr.hiring_manager_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );
$$;

-- Postgres grants EXECUTE to PUBLIC by default; 00044 explains why that matters.
REVOKE ALL ON FUNCTION public.application_is_open(TEXT)             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.interviews_open_candidate(UUID)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.manages_hiring_for_candidate(UUID)    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.manages_hiring_for_application(UUID)  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.application_is_open(TEXT)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.interviews_open_candidate(UUID)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.manages_hiring_for_candidate(UUID)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.manages_hiring_for_application(UUID) TO authenticated;

-- ── candidates ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Org members can read candidates" ON candidates;

DROP POLICY IF EXISTS read_candidates_scoped ON candidates;
CREATE POLICY read_candidates_scoped ON candidates
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
      OR manages_hiring_for_candidate(id)
      OR interviews_open_candidate(id)
    )
  );

-- ── interviews ──────────────────────────────────────────────────────────────
-- An interviewer keeps their own interviews for good: that is their record of
-- work, and the panel is meant to retain it after the hire.

DROP POLICY IF EXISTS "Org members can read interviews" ON interviews;

DROP POLICY IF EXISTS read_interviews_scoped ON interviews;
CREATE POLICY read_interviews_scoped ON interviews
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      interviewer_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
      OR manages_hiring_for_application(candidate_application_id)
    )
  );

-- ── interview_feedback ──────────────────────────────────────────────────────
-- Was readable by every manager in the company. Now the hiring manager for that
-- requisition, HR, admin and leadership — and the interviewer's own.

DROP POLICY IF EXISTS read_interviewer_or_hiring_feedback ON interview_feedback;
CREATE POLICY read_interviewer_or_hiring_feedback ON interview_feedback
  FOR SELECT USING (
    interviewer_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    OR EXISTS (
      SELECT 1 FROM interviews i
      WHERE i.id = interview_feedback.interview_id
        AND manages_hiring_for_application(i.candidate_application_id)
    )
  );

-- Feedback is a record of a judgement made at a point in time. An interviewer
-- writes it and may correct it until they submit; after that it stands.
DROP POLICY IF EXISTS "Interviewers can manage own feedback" ON interview_feedback;

DROP POLICY IF EXISTS write_own_feedback ON interview_feedback;
CREATE POLICY write_own_feedback ON interview_feedback
  FOR INSERT WITH CHECK (
    interviewer_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

DROP POLICY IF EXISTS update_own_unsubmitted_feedback ON interview_feedback;
CREATE POLICY update_own_unsubmitted_feedback ON interview_feedback
  FOR UPDATE USING (
    interviewer_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND submitted_at IS NULL
  )
  WITH CHECK (
    interviewer_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

-- ── Requisition pay band ────────────────────────────────────────────────────
-- The salary range and the budget move out of the org-wide readable table, in
-- line with the compensation rules set in 00038.

CREATE TABLE IF NOT EXISTS job_requisition_budget (
  job_requisition_id UUID PRIMARY KEY REFERENCES job_requisitions(id) ON DELETE CASCADE,
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  min_salary         NUMERIC,
  max_salary         NUMERIC,
  budget_amount      NUMERIC,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO job_requisition_budget (job_requisition_id, organization_id, min_salary, max_salary, budget_amount)
SELECT id, organization_id, min_salary, max_salary, budget_amount
FROM job_requisitions
ON CONFLICT (job_requisition_id) DO NOTHING;

ALTER TABLE job_requisitions
  DROP COLUMN IF EXISTS min_salary,
  DROP COLUMN IF EXISTS max_salary,
  DROP COLUMN IF EXISTS budget_amount;

ALTER TABLE job_requisition_budget ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_requisition_budget ON job_requisition_budget;
CREATE POLICY read_requisition_budget ON job_requisition_budget
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
      OR job_requisition_id IN (
        SELECT id FROM job_requisitions
        WHERE hiring_manager_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS manage_requisition_budget ON job_requisition_budget;
CREATE POLICY manage_requisition_budget ON job_requisition_budget
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

DROP TRIGGER IF EXISTS trg_requisition_budget_updated ON job_requisition_budget;
CREATE TRIGGER trg_requisition_budget_updated
  BEFORE UPDATE ON job_requisition_budget
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE job_requisition_budget IS
  'Pay band and budget for a requisition. HR, admin, leadership and the hiring manager.';
