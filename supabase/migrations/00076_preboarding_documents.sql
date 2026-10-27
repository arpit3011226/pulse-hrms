-- ============================================================================
-- Phase 2 — collecting documents before somebody joins.
--
-- HR decides what to ask for, the candidate uploads it from the portal they
-- already have, HR checks it, and on the day they join it all moves onto the
-- employee record so the joining pack is not re-collected.
--
-- Two gates, not one. Asking for a relieving letter before the offer goes out
-- would stall every hire in the country: nobody can resign until they have an
-- offer in hand, so the letter cannot exist yet. So:
--
--   before_offer    identity, education, current salary proof, photograph
--   before_joining  relieving letter, experience letter, final payslip
--
-- File locations are stored as bucket + key, never as a URL. Pulse moves to
-- Azure Blob within about three months and a stored URL would have to be
-- rewritten on every row. (employee_documents.file_url is the older way and
-- is a porting liability — worth tidying when that move happens.)
-- ============================================================================

-- ── What HR can ask for ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('identity', 'education', 'employment', 'financial', 'medical', 'other')),
  -- Which of the two gates this one belongs to.
  gate TEXT NOT NULL DEFAULT 'before_joining'
    CHECK (gate IN ('before_offer', 'before_joining')),
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  -- Shown to the candidate on the upload row. This is where "a masked copy is
  -- fine" or "all pages in one PDF" belongs.
  guidance TEXT,
  -- Narrowing, both optional. Null means it applies to everyone.
  employment_type TEXT,
  designation_id UUID REFERENCES designations(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_doc_req_org ON document_requirements(organization_id, is_active, gate);

CREATE OR REPLACE TRIGGER set_document_requirements_updated_at
  BEFORE UPDATE ON document_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── What one candidate has been asked for ───────────────────────────────────

CREATE TABLE IF NOT EXISTS preboarding_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  candidate_application_id UUID REFERENCES candidate_applications(id) ON DELETE SET NULL,
  gate TEXT NOT NULL CHECK (gate IN ('before_offer', 'before_joining')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'in_progress', 'submitted', 'approved')),
  due_date DATE,
  sent_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- One list per gate per candidate. Asking twice for the same stage is a
  -- mistake, not a feature.
  UNIQUE (candidate_id, gate)
);

CREATE INDEX IF NOT EXISTS idx_preboard_checklist_cand ON preboarding_checklists(candidate_id);
CREATE INDEX IF NOT EXISTS idx_preboard_checklist_org ON preboarding_checklists(organization_id, status);

CREATE OR REPLACE TRIGGER set_preboarding_checklists_updated_at
  BEFORE UPDATE ON preboarding_checklists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── The individual asks ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS preboarding_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES preboarding_checklists(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES document_requirements(id) ON DELETE SET NULL,
  -- Copied, not joined. Renaming an entry in the catalogue two years from now
  -- must not rewrite what somebody was actually asked for.
  label TEXT NOT NULL,
  guidance TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'uploaded', 'verified', 'rejected')),
  -- Bucket and key, deliberately not a URL. See the note at the top.
  storage_bucket TEXT,
  storage_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preboard_item_checklist ON preboarding_checklist_items(checklist_id, sort_order);

CREATE OR REPLACE TRIGGER set_preboarding_items_updated_at
  BEFORE UPDATE ON preboarding_checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── A candidate must not be able to pass their own documents ────────────────
--
-- The candidate needs UPDATE on their own item rows, because that is how an
-- upload is recorded. Row-level security can give them the row; it cannot
-- stop them writing `verified` into it. That is exactly how QA-36 happened,
-- so the guard goes in at the same time as the table rather than after
-- somebody notices.

CREATE OR REPLACE FUNCTION guard_preboarding_item_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  v_role := get_user_role();

  -- Checking a document is HR's job. Recruiters chase, HR decides.
  IF v_role IN ('super_admin', 'hr_admin') THEN
    RETURN NEW;
  END IF;

  -- Everybody else may attach a file and say it is uploaded. Nothing more.
  IF NEW.status NOT IN ('pending', 'uploaded') THEN
    RAISE EXCEPTION 'Only HR can approve or reject a document.' USING ERRCODE = '42501';
  END IF;

  IF  NEW.reviewed_by      IS DISTINCT FROM OLD.reviewed_by
   OR NEW.reviewed_at      IS DISTINCT FROM OLD.reviewed_at
   OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
   OR NEW.label            IS DISTINCT FROM OLD.label
   OR NEW.is_mandatory     IS DISTINCT FROM OLD.is_mandatory
   OR NEW.checklist_id     IS DISTINCT FROM OLD.checklist_id
   OR NEW.requirement_id   IS DISTINCT FROM OLD.requirement_id
  THEN
    RAISE EXCEPTION 'Only HR can change that part of a document request.' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END $$;

COMMENT ON FUNCTION guard_preboarding_item_review() IS
  'A candidate may attach a file to their own row. Marking it verified is HR''s, and RLS cannot say so by itself.';

DROP TRIGGER IF EXISTS trg_guard_preboarding_item_review ON preboarding_checklist_items;
CREATE TRIGGER trg_guard_preboarding_item_review
  BEFORE UPDATE ON preboarding_checklist_items
  FOR EACH ROW EXECUTE FUNCTION guard_preboarding_item_review();

-- ── The list keeps its own status up to date ────────────────────────────────
--
-- So the candidate never needs write access to the checklist row itself.

CREATE OR REPLACE FUNCTION roll_up_preboarding_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outstanding INTEGER;
  v_current     TEXT;
BEGIN
  SELECT status INTO v_current FROM preboarding_checklists WHERE id = NEW.checklist_id;
  IF v_current IN ('approved', 'draft') THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_outstanding
  FROM preboarding_checklist_items
  WHERE checklist_id = NEW.checklist_id
    AND is_mandatory
    AND status IN ('pending', 'rejected');

  UPDATE preboarding_checklists
  SET status       = CASE WHEN v_outstanding = 0 THEN 'submitted' ELSE 'in_progress' END,
      submitted_at = CASE WHEN v_outstanding = 0 THEN COALESCE(submitted_at, now()) ELSE NULL END
  WHERE id = NEW.checklist_id;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_roll_up_preboarding_status ON preboarding_checklist_items;
CREATE TRIGGER trg_roll_up_preboarding_status
  AFTER UPDATE OF status ON preboarding_checklist_items
  FOR EACH ROW EXECUTE FUNCTION roll_up_preboarding_status();

-- ── Row-level security ──────────────────────────────────────────────────────

ALTER TABLE document_requirements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE preboarding_checklists       ENABLE ROW LEVEL SECURITY;
ALTER TABLE preboarding_checklist_items  ENABLE ROW LEVEL SECURITY;

-- Who is hiring: HR plus the people who actually run a pipeline.
-- Matches become_employee(), deliberately.

DROP POLICY IF EXISTS "staff_read_document_requirements" ON document_requirements;
CREATE POLICY "staff_read_document_requirements" ON document_requirements
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'manager', 'leadership')
  );

DROP POLICY IF EXISTS "hr_manages_document_requirements" ON document_requirements;
CREATE POLICY "hr_manages_document_requirements" ON document_requirements
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  ) WITH CHECK (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

DROP POLICY IF EXISTS "hiring_reads_checklists" ON preboarding_checklists;
CREATE POLICY "hiring_reads_checklists" ON preboarding_checklists
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'manager', 'leadership')
  );

DROP POLICY IF EXISTS "candidate_reads_own_checklist" ON preboarding_checklists;
CREATE POLICY "candidate_reads_own_checklist" ON preboarding_checklists
  FOR SELECT USING (
    candidate_id IN (SELECT id FROM candidates WHERE profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "hiring_manages_checklists" ON preboarding_checklists;
CREATE POLICY "hiring_manages_checklists" ON preboarding_checklists
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'manager', 'leadership')
  ) WITH CHECK (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'manager', 'leadership')
  );

DROP POLICY IF EXISTS "hiring_reads_checklist_items" ON preboarding_checklist_items;
CREATE POLICY "hiring_reads_checklist_items" ON preboarding_checklist_items
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'manager', 'leadership')
  );

DROP POLICY IF EXISTS "hiring_manages_checklist_items" ON preboarding_checklist_items;
CREATE POLICY "hiring_manages_checklist_items" ON preboarding_checklist_items
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'manager', 'leadership')
  ) WITH CHECK (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'manager', 'leadership')
  );

DROP POLICY IF EXISTS "candidate_reads_own_items" ON preboarding_checklist_items;
CREATE POLICY "candidate_reads_own_items" ON preboarding_checklist_items
  FOR SELECT USING (
    checklist_id IN (
      SELECT c.id FROM preboarding_checklists c
      JOIN candidates cd ON cd.id = c.candidate_id
      WHERE cd.profile_id = auth.uid()
    )
  );

-- The candidate records their own upload here. What they may actually put in
-- the row is settled by guard_preboarding_item_review() above, not by this.
DROP POLICY IF EXISTS "candidate_updates_own_items" ON preboarding_checklist_items;
CREATE POLICY "candidate_updates_own_items" ON preboarding_checklist_items
  FOR UPDATE USING (
    checklist_id IN (
      SELECT c.id FROM preboarding_checklists c
      JOIN candidates cd ON cd.id = c.candidate_id
      WHERE cd.profile_id = auth.uid()
        AND c.status <> 'approved'
    )
  );

-- ── Where the files live ────────────────────────────────────────────────────
--
-- Private from the start. QA-19 was a public bucket serving somebody's PAN
-- card to the open internet with no credentials, and these are the same class
-- of document.
--
-- Path: <candidate_id>/<item_id>_<filename>, so the first folder is the owner,
-- matching employee-documents.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'candidate-documents',
  'candidate-documents',
  false,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

DROP POLICY IF EXISTS "read_own_or_hiring_candidate_docs" ON storage.objects;
CREATE POLICY "read_own_or_hiring_candidate_docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'candidate-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.candidates WHERE profile_id = auth.uid()
      )
      OR public.get_user_role() IN ('super_admin', 'hr_admin', 'manager', 'leadership')
    )
  );

DROP POLICY IF EXISTS "write_own_candidate_docs" ON storage.objects;
CREATE POLICY "write_own_candidate_docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'candidate-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.candidates WHERE profile_id = auth.uid()
      )
      OR public.get_user_role() IN ('super_admin', 'hr_admin')
    )
  );

DROP POLICY IF EXISTS "update_own_candidate_docs" ON storage.objects;
CREATE POLICY "update_own_candidate_docs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'candidate-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.candidates WHERE profile_id = auth.uid()
      )
      OR public.get_user_role() IN ('super_admin', 'hr_admin')
    )
  );

-- Deleting somebody's identity document is HR's, not self-service.
DROP POLICY IF EXISTS "hr_deletes_candidate_docs" ON storage.objects;
CREATE POLICY "hr_deletes_candidate_docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'candidate-documents'
    AND public.get_user_role() IN ('super_admin', 'hr_admin')
  );

-- ── A starting catalogue ────────────────────────────────────────────────────
--
-- A sensible Indian joining pack, split across the two gates. HR edits this
-- freely afterwards — it is a starting point, not a rule.
--
-- Aadhaar is compulsory and a full copy, decided by August on 27 October 2026
-- against advice. The note is kept in the register with what would change it.

INSERT INTO document_requirements
  (organization_id, code, label, description, category, gate, is_mandatory, guidance, sort_order)
SELECT o.id, r.code, r.label, r.description, r.category, r.gate, r.is_mandatory, r.guidance, r.sort_order
FROM organizations o
CROSS JOIN (VALUES
  -- Before the offer: things a candidate can produce today.
  ('pan_card', 'PAN card', 'Permanent Account Number card.', 'identity', 'before_offer', true,
   'A clear photo or scan of the front. Make sure the number and your name are readable.', 10),
  ('aadhaar', 'Aadhaar', 'Aadhaar card, both sides.', 'identity', 'before_offer', true,
   'Both sides in one file. Please check the address page is readable.', 20),
  ('photograph', 'Passport size photograph', 'Recent photograph on a plain background.', 'identity', 'before_offer', true,
   'Taken in the last six months, plain background, face clearly visible.', 30),
  ('address_proof', 'Address proof', 'Anything showing your current address.', 'identity', 'before_offer', true,
   'Passport, voter ID, driving licence, or a utility bill from the last three months.', 40),
  ('highest_degree', 'Highest degree certificate', 'Degree or provisional certificate.', 'education', 'before_offer', true,
   'The final certificate. A provisional one is fine if the degree has not been issued yet.', 50),
  ('current_salary_proof', 'Current salary proof', 'Latest salary slip or CTC letter.', 'financial', 'before_offer', true,
   'Your most recent payslip, or the CTC letter from your present employer.', 60),
  ('resume', 'Updated CV', 'Your current CV.', 'employment', 'before_offer', true,
   'A PDF is easiest for us to read.', 70),

  -- Before joining: things that only exist once they have resigned.
  ('resignation_acceptance', 'Resignation acceptance', 'Acceptance from your present employer.', 'employment', 'before_joining', true,
   'The email or letter confirming your resignation has been accepted.', 110),
  ('relieving_letter', 'Relieving letter', 'From your most recent employer.', 'employment', 'before_joining', true,
   'Issued on your last working day. Send it as soon as you have it.', 120),
  ('experience_letter', 'Experience letter', 'Service certificate from your last employer.', 'employment', 'before_joining', true,
   'Showing your dates of service and your last designation.', 130),
  ('last_three_payslips', 'Last three payslips', 'Final three months of pay.', 'financial', 'before_joining', true,
   'All three in one PDF if you can.', 140),
  ('bank_proof', 'Bank account proof', 'Cancelled cheque or passbook first page.', 'financial', 'before_joining', true,
   'Your name, account number and IFSC must all be visible. This is where your salary goes.', 150),
  ('pf_details', 'Previous PF details', 'UAN and previous PF member ID.', 'financial', 'before_joining', false,
   'Only if you have been a PF member before. It lets us transfer rather than restart.', 160)
) AS r(code, label, description, category, gate, is_mandatory, guidance, sort_order)
ON CONFLICT (organization_id, code) DO NOTHING;
