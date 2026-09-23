-- ============================================================================
-- F12–F19 — Hiring
--
-- Extends the existing recruitment tables rather than replacing them. Panel
-- interviews already work as one interviews row per interviewer, so that shape
-- is kept; what was missing is approval, a real offer, structured feedback, a
-- candidate pool and background checks.
--
-- All additive: new nullable columns, new tables, new indexes.
-- ============================================================================

-- ── F12: requisition approval ───────────────────────────────────────────────
-- A requisition went straight from draft to open. Whoever raised it had, in
-- effect, approved it.

ALTER TABLE job_requisitions ADD COLUMN IF NOT EXISTS approval_status TEXT
  DEFAULT 'not_submitted';
ALTER TABLE job_requisitions ADD COLUMN IF NOT EXISTS approver_id UUID REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE job_requisitions ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE job_requisitions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE job_requisitions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE job_requisitions ADD COLUMN IF NOT EXISTS approval_notes TEXT;
ALTER TABLE job_requisitions ADD COLUMN IF NOT EXISTS budget_amount NUMERIC(14,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_requisitions_approval_status_check'
  ) THEN
    ALTER TABLE job_requisitions ADD CONSTRAINT job_requisitions_approval_status_check
      CHECK (approval_status IN ('not_submitted', 'pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_requisitions_approval
  ON job_requisitions(organization_id, approval_status);

-- ── F13: offer as a real document ───────────────────────────────────────────
-- The offer was a row holding CTC and a joining date. No acceptance, no
-- decline, no history of what changed between versions.

ALTER TABLE offer_letters ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE offer_letters ADD COLUMN IF NOT EXISTS supersedes_offer_id UUID REFERENCES offer_letters(id) ON DELETE SET NULL;
ALTER TABLE offer_letters ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE offer_letters ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
ALTER TABLE offer_letters ADD COLUMN IF NOT EXISTS decline_reason TEXT;
ALTER TABLE offer_letters ADD COLUMN IF NOT EXISTS candidate_remarks TEXT;
ALTER TABLE offer_letters ADD COLUMN IF NOT EXISTS revision_reason TEXT;

-- ── F15: structured scorecards ──────────────────────────────────────────────
-- Feedback was one overall rating plus free text, which cannot be compared
-- across a panel.

CREATE TABLE IF NOT EXISTS interview_scorecard_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  interview_feedback_id UUID NOT NULL REFERENCES interview_feedback(id) ON DELETE CASCADE,
  competency TEXT NOT NULL,
  rating NUMERIC(3,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scorecard_feedback ON interview_scorecard_items(interview_feedback_id);

-- The competencies a panel is asked to rate, per organisation.
CREATE TABLE IF NOT EXISTS interview_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, name)
);

-- ── F14: scheduling ─────────────────────────────────────────────────────────

ALTER TABLE interviews ADD COLUMN IF NOT EXISTS rescheduled_from UUID REFERENCES interviews(id) ON DELETE SET NULL;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS reschedule_reason TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS candidate_confirmed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_interviews_upcoming
  ON interviews(organization_id, scheduled_start)
  WHERE status = 'scheduled';

-- ── F16: candidate pool ─────────────────────────────────────────────────────
-- Rejected candidates disappeared. No reason, no tags, no way to find them
-- again when a similar role opens.

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS in_talent_pool BOOLEAN DEFAULT false;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS revisit_after DATE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS pool_notes TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS rejection_stage TEXT;

CREATE INDEX IF NOT EXISTS idx_candidates_pool
  ON candidates(organization_id, in_talent_pool)
  WHERE in_talent_pool = true;
CREATE INDEX IF NOT EXISTS idx_candidates_tags ON candidates USING GIN (tags);

-- ── F18: background verification ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS background_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL DEFAULT 'employment'
    CHECK (check_type IN ('identity', 'address', 'education', 'employment',
                          'criminal', 'credit', 'reference', 'drug', 'other')),
  vendor TEXT,
  reference_number TEXT,
  initiated_on DATE DEFAULT CURRENT_DATE,
  completed_on DATE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'clear', 'discrepancy', 'failed', 'cancelled')),
  findings TEXT,
  document_url TEXT,
  initiated_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- A check belongs to a candidate or an employee, not neither and not both
  CONSTRAINT bgv_has_subject CHECK (
    (candidate_id IS NOT NULL AND employee_id IS NULL)
    OR (candidate_id IS NULL AND employee_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_bgv_candidate ON background_verifications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_bgv_employee  ON background_verifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_bgv_status    ON background_verifications(organization_id, status);

CREATE OR REPLACE TRIGGER set_bgv_updated_at
  BEFORE UPDATE ON background_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE interview_scorecard_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_competencies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_verifications    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_read_scorecards" ON interview_scorecard_items;
CREATE POLICY "org_read_scorecards" ON interview_scorecard_items
  FOR SELECT USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "recruiters_manage_scorecards" ON interview_scorecard_items;
CREATE POLICY "recruiters_manage_scorecards" ON interview_scorecard_items
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership', 'manager')
  );

DROP POLICY IF EXISTS "org_read_competencies" ON interview_competencies;
CREATE POLICY "org_read_competencies" ON interview_competencies
  FOR SELECT USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "admin_manage_competencies" ON interview_competencies;
CREATE POLICY "admin_manage_competencies" ON interview_competencies
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

-- Background checks hold sensitive findings: HR and leadership only, plus the
-- person it is about.
DROP POLICY IF EXISTS "read_own_or_hr_bgv" ON background_verifications;
CREATE POLICY "read_own_or_hr_bgv" ON background_verifications
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR candidate_id IN (SELECT id FROM candidates WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS "hr_manage_bgv" ON background_verifications;
CREATE POLICY "hr_manage_bgv" ON background_verifications
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

-- ── F17: candidate portal access ────────────────────────────────────────────
-- A candidate with a login may read their own application, the requisition
-- they applied to, their interviews and their offer. They may not read anyone
-- else's, and they may not write.

DROP POLICY IF EXISTS "candidate_reads_own_application" ON candidate_applications;
CREATE POLICY "candidate_reads_own_application" ON candidate_applications
  FOR SELECT USING (
    candidate_id IN (SELECT id FROM candidates WHERE profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "candidate_reads_own_interviews" ON interviews;
CREATE POLICY "candidate_reads_own_interviews" ON interviews
  FOR SELECT USING (
    candidate_application_id IN (
      SELECT ca.id FROM candidate_applications ca
      JOIN candidates c ON c.id = ca.candidate_id
      WHERE c.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "candidate_reads_own_offer" ON offer_letters;
CREATE POLICY "candidate_reads_own_offer" ON offer_letters
  FOR SELECT USING (
    candidate_application_id IN (
      SELECT ca.id FROM candidate_applications ca
      JOIN candidates c ON c.id = ca.candidate_id
      WHERE c.profile_id = auth.uid()
    )
  );
