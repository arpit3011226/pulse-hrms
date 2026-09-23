-- ============================================================================
-- F38–F42 — Retire / Alumni
--
-- The journey currently stops the day someone leaves. Exit clearance exists;
-- nothing after it does.
--
-- Three pieces:
--   final_settlements        what is owed, what is recovered, what is paid
--   exit_interview_responses structured answers instead of one free-text box
--   alumni access            an ex-employee keeps a login and can fetch their
--                            own payslips, Form 16 and letters
--
-- The identity work in F43 is what makes alumni access possible: the person
-- signs in on their PERSONAL email, which does not stop working when their
-- work address is switched off.
-- ============================================================================

-- ── F38: full and final settlement ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS final_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_exit_record_id UUID REFERENCES employee_exit_records(id) ON DELETE SET NULL,

  last_working_date DATE NOT NULL,
  settlement_date DATE,

  -- Amounts owed to the leaver
  pending_salary        NUMERIC(14,2) DEFAULT 0,
  leave_encashment      NUMERIC(14,2) DEFAULT 0,
  gratuity              NUMERIC(14,2) DEFAULT 0,
  bonus_or_incentive    NUMERIC(14,2) DEFAULT 0,
  other_earnings        NUMERIC(14,2) DEFAULT 0,

  -- Amounts recovered from them
  notice_period_recovery NUMERIC(14,2) DEFAULT 0,
  asset_recovery         NUMERIC(14,2) DEFAULT 0,
  advance_recovery       NUMERIC(14,2) DEFAULT 0,
  tax_deducted           NUMERIC(14,2) DEFAULT 0,
  other_deductions       NUMERIC(14,2) DEFAULT 0,

  -- Stored rather than computed on read, so the figure agreed at the time is
  -- the figure that stays on the record even if a rate changes later.
  net_payable NUMERIC(14,2) DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'paid', 'cancelled')),
  approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  paid_on DATE,
  payment_reference TEXT,
  notes TEXT,

  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (employee_id)
);

CREATE INDEX IF NOT EXISTS idx_settlements_org    ON final_settlements(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_settlements_emp    ON final_settlements(employee_id);

CREATE OR REPLACE TRIGGER set_settlements_updated_at
  BEFORE UPDATE ON final_settlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── F42: structured exit interview ──────────────────────────────────────────
-- employee_exit_records.exit_interview_notes is one free-text box, which
-- cannot be counted or compared. These can.

CREATE TABLE IF NOT EXISTS exit_interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'rating'
    CHECK (question_type IN ('rating', 'text', 'single_select')),
  options TEXT[],
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exit_interview_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_exit_record_id UUID NOT NULL REFERENCES employee_exit_records(id) ON DELETE CASCADE,
  question_id UUID REFERENCES exit_interview_questions(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,          -- copied, so the answer survives an edited question
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  selected_option TEXT,
  text_answer TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exit_resp_record ON exit_interview_responses(employee_exit_record_id);
CREATE INDEX IF NOT EXISTS idx_exit_resp_q      ON exit_interview_responses(question_id);

-- ── F40: rehire eligibility ─────────────────────────────────────────────────

ALTER TABLE employee_exit_records ADD COLUMN IF NOT EXISTS rehire_eligible BOOLEAN;
ALTER TABLE employee_exit_records ADD COLUMN IF NOT EXISTS rehire_notes TEXT;

-- ── Alumni access ───────────────────────────────────────────────────────────
--
-- The employees row is NOT deleted when somebody leaves — its status changes.
-- So a policy of the form "employee_id IN (SELECT id FROM employees WHERE
-- profile_id = auth.uid())" keeps working afterwards, provided the profile
-- stays active and the person can still sign in.
--
-- That is what the personal-email anchor from F43 gives us. What this section
-- adds is the deliberate part: mark the leaver as an alumnus so it is a
-- decision rather than an accident of the employees row surviving.

CREATE OR REPLACE FUNCTION mark_as_alumni(p_employee_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
BEGIN
  SELECT profile_id INTO v_profile FROM employees WHERE id = p_employee_id;
  IF v_profile IS NULL THEN
    RETURN;   -- never had a login; nothing to keep alive
  END IF;

  UPDATE profiles
  SET role = 'alumni',
      is_active = true          -- they keep the login, with far less reach
  WHERE id = v_profile;
END $$;

COMMENT ON FUNCTION mark_as_alumni(UUID) IS
  'F39: on exit, move the login to the alumni role so they keep access to their own documents and nothing else.';

GRANT EXECUTE ON FUNCTION mark_as_alumni(UUID) TO authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE final_settlements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_interview_questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_interview_responses  ENABLE ROW LEVEL SECURITY;

-- A leaver can see their own settlement. It is their money.
DROP POLICY IF EXISTS "read_own_or_hr_settlement" ON final_settlements;
CREATE POLICY "read_own_or_hr_settlement" ON final_settlements
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS "hr_manages_settlement" ON final_settlements;
CREATE POLICY "hr_manages_settlement" ON final_settlements
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin')
  );

DROP POLICY IF EXISTS "org_read_exit_questions" ON exit_interview_questions;
CREATE POLICY "org_read_exit_questions" ON exit_interview_questions
  FOR SELECT USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "hr_manages_exit_questions" ON exit_interview_questions;
CREATE POLICY "hr_manages_exit_questions" ON exit_interview_questions
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

-- Exit interview answers are candid by design. HR and leadership only — not
-- the manager the person may have been talking about.
DROP POLICY IF EXISTS "hr_reads_exit_responses" ON exit_interview_responses;
CREATE POLICY "hr_reads_exit_responses" ON exit_interview_responses
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

DROP POLICY IF EXISTS "hr_manages_exit_responses" ON exit_interview_responses;
CREATE POLICY "hr_manages_exit_responses" ON exit_interview_responses
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );
