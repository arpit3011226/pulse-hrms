-- ============================================================================
-- Phase 3 — the legal documents a new joiner has to read and sign.
--
-- NDA, confidentiality, POSH, IT acceptable use, code of conduct, data
-- protection. HR decides which apply to whom, the person signs on screen, and
-- they keep a PDF of exactly what they signed.
--
-- WHY THIS IS NOT company_policies + policy_acknowledgements
--
-- That pair already exists and is a tick box: policy, person, timestamp. It is
-- fine for "I have read the leave policy". It is not enough for an agreement,
-- because it cannot answer the only question that matters in a dispute —
-- *what did they actually agree to?* The policy text can be edited afterwards
-- and the acknowledgement still points at it.
--
-- So every signature here freezes its own copy of the rendered text and a
-- SHA-256 of it. Editing a template afterwards creates a new version and
-- leaves every signature already given pointing at the words that were on the
-- screen at the time.
--
-- LEGAL FOOTING, as it stands in India
--
--   * Section 10A of the IT Act 2000 makes a contract formed electronically
--     valid. Employment agreements are not in the excluded schedule.
--   * Section 63 of the Bharatiya Sakshya Adhiniyam 2023 (which replaced
--     section 65B of the Evidence Act from 1 July 2024) governs putting an
--     electronic record in evidence. Freezing the text and hashing it is the
--     practical minimum for that.
--   * Section 27 of the Contract Act 1872 makes restraint of trade void.
--     A non-compete that bites AFTER employment ends is generally
--     unenforceable here, which is why the seeded template covers
--     confidentiality and non-solicitation and limits any non-compete to the
--     period of employment. Decided with August on 27 October 2026.
--   * Stamp duty may apply under the state Stamp Act. Not modelled. One
--     question for counsel before a few hundred of these are issued.
--
-- The seeded wording is a sensible starting draft, not legal advice, and says
-- so on each template. It needs counsel's sign-off before real use.
-- ============================================================================

CREATE TABLE IF NOT EXISTS agreement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('nda', 'confidentiality', 'posh', 'it_policy', 'code_of_conduct',
                        'data_protection', 'other')),
  description TEXT,
  body_html TEXT NOT NULL,
  -- Bumped whenever the wording changes. A signature records the version it
  -- was given, so history stays readable.
  version INTEGER NOT NULL DEFAULT 1,
  requires_signature BOOLEAN NOT NULL DEFAULT true,
  -- The sentence the person ticks. Held per template because what somebody
  -- agreed to is part of the evidence, not decoration.
  consent_statement TEXT NOT NULL
    DEFAULT 'I have read and understood this document, and I agree to be bound by it.',
  governing_law_city TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  needs_legal_review BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_agreement_templates_org ON agreement_templates(organization_id, is_active);

CREATE OR REPLACE TRIGGER set_agreement_templates_updated_at
  BEFORE UPDATE ON agreement_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Who gets which one ──────────────────────────────────────────────────────
--
-- Null in a column means "do not narrow on this". A rule with everything null
-- applies to the whole company, which is what most of these are.

CREATE TABLE IF NOT EXISTS agreement_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES agreement_templates(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  designation_id UUID REFERENCES designations(id) ON DELETE CASCADE,
  employment_type TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agreement_rules_tpl ON agreement_assignment_rules(template_id);

-- ── One person, one agreement, one signature ────────────────────────────────

CREATE TABLE IF NOT EXISTS employee_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  template_id UUID REFERENCES agreement_templates(id) ON DELETE SET NULL,
  template_version INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,

  -- The evidence. Frozen when the agreement is issued, never rewritten.
  rendered_html TEXT NOT NULL,
  rendered_sha256 TEXT,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'viewed', 'signed', 'declined', 'superseded')),
  is_mandatory BOOLEAN NOT NULL DEFAULT true,

  issued_at TIMESTAMPTZ DEFAULT now(),
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,

  -- What they typed, and the exact sentence they agreed to.
  signed_name TEXT,
  consent_statement TEXT,
  signer_user_agent TEXT,

  -- The PDF they can download afterwards, in employee-documents under
  -- <employee_id>/agreements/. Bucket + key, not a URL — Azure is coming.
  pdf_path TEXT,

  declined_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Re-issuing the same version to the same person is a mistake. A new
  -- version is a new row, and the old one is marked superseded.
  UNIQUE (employee_id, template_id, template_version)
);

CREATE INDEX IF NOT EXISTS idx_emp_agreements_emp ON employee_agreements(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_emp_agreements_org ON employee_agreements(organization_id, status);

CREATE OR REPLACE TRIGGER set_employee_agreements_updated_at
  BEFORE UPDATE ON employee_agreements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── A signature must mean something ─────────────────────────────────────────
--
-- The employee needs UPDATE on their own agreement row — that is how signing
-- works. Row-level security hands them the row and then has nothing more to
-- say about which columns they write. Same shape as QA-36, so the guard goes
-- in with the table.
--
-- What they may do: record that they viewed it, and sign or decline it.
-- What they may not do: touch the text, the hash, the title, whether it is
-- mandatory, or sign on somebody else's behalf.

CREATE OR REPLACE FUNCTION guard_employee_agreement_signing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_role  app_role;
  v_is_me BOOLEAN;
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  -- The agreed text is evidence. Nobody edits it after issue, HR included —
  -- a change of wording is a new version, not an overwrite.
  IF  NEW.rendered_html    IS DISTINCT FROM OLD.rendered_html
   OR NEW.rendered_sha256  IS DISTINCT FROM OLD.rendered_sha256
   OR NEW.template_version IS DISTINCT FROM OLD.template_version
   OR NEW.employee_id      IS DISTINCT FROM OLD.employee_id
  THEN
    RAISE EXCEPTION 'The text of an agreement cannot be changed once it has been issued. Issue a new version instead.'
      USING ERRCODE = '42501';
  END IF;

  v_role := get_user_role();
  IF v_role IN ('super_admin', 'hr_admin') THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM employees WHERE id = NEW.employee_id AND profile_id = auth.uid()
  ) INTO v_is_me;

  IF NOT v_is_me THEN
    RAISE EXCEPTION 'You can only sign your own agreements.' USING ERRCODE = '42501';
  END IF;

  IF NEW.status NOT IN ('viewed', 'signed', 'declined') THEN
    RAISE EXCEPTION 'That is not something you can set on an agreement.' USING ERRCODE = '42501';
  END IF;

  -- Signed is final. Changing your mind afterwards is a conversation with HR,
  -- not a database update.
  IF OLD.status = 'signed' AND NEW.status <> 'signed' THEN
    RAISE EXCEPTION 'This has already been signed.' USING ERRCODE = '42501';
  END IF;

  IF  NEW.title        IS DISTINCT FROM OLD.title
   OR NEW.is_mandatory IS DISTINCT FROM OLD.is_mandatory
  THEN
    RAISE EXCEPTION 'Only HR can change that part of an agreement.' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END $$;

COMMENT ON FUNCTION guard_employee_agreement_signing() IS
  'A person signs their own agreement and nothing else. The frozen text and its hash are not editable by anyone, because they are the evidence.';

DROP TRIGGER IF EXISTS trg_guard_employee_agreement_signing ON employee_agreements;
CREATE TRIGGER trg_guard_employee_agreement_signing
  BEFORE UPDATE ON employee_agreements
  FOR EACH ROW EXECUTE FUNCTION guard_employee_agreement_signing();

-- ── Row-level security ──────────────────────────────────────────────────────

ALTER TABLE agreement_templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_agreements        ENABLE ROW LEVEL SECURITY;

-- Templates are readable by staff: the wording is company policy, not a
-- secret, and an employee comparing what they signed against the current
-- version is a reasonable thing to want.
DROP POLICY IF EXISTS "staff_read_agreement_templates" ON agreement_templates;
CREATE POLICY "staff_read_agreement_templates" ON agreement_templates
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND get_user_role() NOT IN ('candidate', 'alumni')
  );

DROP POLICY IF EXISTS "hr_manages_agreement_templates" ON agreement_templates;
CREATE POLICY "hr_manages_agreement_templates" ON agreement_templates
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  ) WITH CHECK (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

DROP POLICY IF EXISTS "hr_manages_assignment_rules" ON agreement_assignment_rules;
CREATE POLICY "hr_manages_assignment_rules" ON agreement_assignment_rules
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  ) WITH CHECK (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

DROP POLICY IF EXISTS "staff_read_assignment_rules" ON agreement_assignment_rules;
CREATE POLICY "staff_read_assignment_rules" ON agreement_assignment_rules
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership', 'manager')
  );

-- What somebody signed is between them and HR. A manager has no business
-- reading their reports' NDAs.
DROP POLICY IF EXISTS "person_reads_own_agreements" ON employee_agreements;
CREATE POLICY "person_reads_own_agreements" ON employee_agreements
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "person_signs_own_agreements" ON employee_agreements;
CREATE POLICY "person_signs_own_agreements" ON employee_agreements
  FOR UPDATE USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "hr_reads_agreements" ON employee_agreements;
CREATE POLICY "hr_reads_agreements" ON employee_agreements
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

DROP POLICY IF EXISTS "hr_manages_agreements" ON employee_agreements;
CREATE POLICY "hr_manages_agreements" ON employee_agreements
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  ) WITH CHECK (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );
