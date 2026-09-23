-- ============================================================================
-- SECURITY — full row-level security audit, round two
--
-- Follows 00035, which fixed payroll and tax. This sweeps the remaining ~250
-- policies. Three classes of problem were found:
--
--   A. Three tables have RLS on and NO policy at all, so nobody can read or
--      write them. Peer reviews and skip-level reviews were unreachable.
--
--   B. Two policies had no FOR clause, so they defaulted to FOR ALL. Any
--      employee could approve payroll or change payroll configuration.
--
--   C. Ten policies granted the whole organisation read access to things that
--      belong to one person: performance reviews, PIPs, interview feedback,
--      offered salaries, prior employment, personal documents.
--
--   D. Storage buckets were readable, writable and deletable by ANY signed-in
--      user — every employee's PAN, Aadhaar and certificates.
--
-- Scope used throughout: you see your own; the people who need to do their job
-- see what they need; HR, leadership and admins see everything.
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- A. Tables with RLS enabled and no policy
-- ════════════════════════════════════════════════════════════════════════════

-- Peer reviews are meant to be candid. The reviewer manages their own; HR can
-- read all for calibration. The person being reviewed deliberately cannot read
-- individual peer reviews — that is what makes them useful.
DROP POLICY IF EXISTS "reviewer_manages_own_peer_review" ON peer_reviews;
CREATE POLICY "reviewer_manages_own_peer_review" ON peer_reviews
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND peer_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "hr_reads_peer_reviews" ON peer_reviews;
CREATE POLICY "hr_reads_peer_reviews" ON peer_reviews
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

-- Who is taking part in a review cycle.
DROP POLICY IF EXISTS "read_own_review_participation" ON review_participants;
CREATE POLICY "read_own_review_participation" ON review_participants
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      reviewer_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership', 'manager')
    )
  );

DROP POLICY IF EXISTS "hr_manages_review_participants" ON review_participants;
CREATE POLICY "hr_manages_review_participants" ON review_participants
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership', 'manager')
  );

-- Skip-level reviews: the skip-level manager writes them, HR reads them.
DROP POLICY IF EXISTS "skip_manager_manages_own" ON skip_level_reviews;
CREATE POLICY "skip_manager_manages_own" ON skip_level_reviews
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND skip_level_manager_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "hr_manages_skip_level" ON skip_level_reviews;
CREATE POLICY "hr_manages_skip_level" ON skip_level_reviews
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

-- ════════════════════════════════════════════════════════════════════════════
-- B. Policies with no FOR clause (defaulted to FOR ALL)
-- ════════════════════════════════════════════════════════════════════════════

-- Payroll approvals ARE the control on payroll. Everyone may see the state of
-- an approval; only payroll and admins may record one.
DROP POLICY IF EXISTS "org_iso_payroll_approvals" ON payroll_approvals;

CREATE POLICY "org_reads_payroll_approvals" ON payroll_approvals
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "payroll_manages_approvals" ON payroll_approvals
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin', 'leadership')
  );

-- Payroll configuration sets pay dates and approval rules.
DROP POLICY IF EXISTS "org_iso_payroll_config" ON payroll_config;

CREATE POLICY "org_reads_payroll_config" ON payroll_config
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "payroll_manages_config" ON payroll_config
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin')
  );

-- ════════════════════════════════════════════════════════════════════════════
-- C. Personal records that were readable by the whole organisation
-- ════════════════════════════════════════════════════════════════════════════

-- Performance reviews — own, the reviewer, the employee's manager, and HR.
DROP POLICY IF EXISTS "Org members can read performance_reviews" ON performance_reviews;
CREATE POLICY "read_own_team_or_hr_reviews" ON performance_reviews
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR reviewer_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR employee_id IN (
        SELECT id FROM employees
        WHERE reporting_manager_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      )
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS "Org members can read self_reviews" ON self_reviews;
-- No organization_id on this table; scope follows the parent performance
-- review, which is itself restricted above.
CREATE POLICY "read_own_or_reviewing_self_reviews" ON self_reviews
  FOR SELECT USING (
    performance_review_id IN (SELECT id FROM performance_reviews)
    OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

DROP POLICY IF EXISTS "Org members can read manager_reviews" ON manager_reviews;
-- No organization_id on this table; scope follows the parent performance
-- review, which is itself restricted above.
CREATE POLICY "read_own_or_reviewing_manager_reviews" ON manager_reviews
  FOR SELECT USING (
    performance_review_id IN (SELECT id FROM performance_reviews)
    OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

-- A PIP is among the most sensitive things about a person.
DROP POLICY IF EXISTS "Org members can read performance_improvement_plans" ON performance_improvement_plans;
CREATE POLICY "read_own_manager_or_hr_pip" ON performance_improvement_plans
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR employee_id IN (
        SELECT id FROM employees
        WHERE reporting_manager_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      )
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

-- Interview feedback — the interviewer and the hiring side only.
DROP POLICY IF EXISTS "Org members can read interview_feedback" ON interview_feedback;
CREATE POLICY "read_interviewer_or_hiring_feedback" ON interview_feedback
  FOR SELECT USING (
    interviewer_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership', 'manager')
  );

-- Offered salaries were visible to everyone.
DROP POLICY IF EXISTS "Org members can read offer_letters" ON offer_letters;
CREATE POLICY "read_hiring_offers" ON offer_letters
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership', 'manager')
  );
-- The candidate's own view is granted separately in 00034.

-- Salary structures reveal the grade bands.
DROP POLICY IF EXISTS "org_members_read_salary_structures" ON salary_structures;
CREATE POLICY "hr_reads_salary_structures" ON salary_structures
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin', 'leadership')
  );

-- Someone's previous employment history.
DROP POLICY IF EXISTS "org_members_read_experience" ON employee_previous_experience;
CREATE POLICY "read_own_or_hr_experience" ON employee_previous_experience
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

-- Per-employee document records.
DROP POLICY IF EXISTS "read_org_documents" ON documents;
CREATE POLICY "read_own_or_hr_documents" ON documents
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IS NULL                       -- org-wide documents, e.g. policies
      OR employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- D. Storage buckets
--
-- Every one of these was `bucket_id = '...'` and nothing else, for any signed-in
-- user: read, overwrite and delete of every employee's identity documents.
--
-- Paths in use:
--   employee-documents     {employee_id}/identity/...  and  {employee_id}/documents/...
--   reimbursement-receipts {org_id}/{employee_id}/{uuid}.ext
-- ════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "auth_read_employee_docs"   ON storage.objects;
DROP POLICY IF EXISTS "auth_upload_employee_docs" ON storage.objects;
DROP POLICY IF EXISTS "auth_update_employee_docs" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_employee_docs" ON storage.objects;

CREATE POLICY "read_own_or_hr_employee_docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.employees WHERE profile_id = auth.uid()
      )
      OR public.get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

CREATE POLICY "write_own_or_hr_employee_docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'employee-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.employees WHERE profile_id = auth.uid()
      )
      OR public.get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

CREATE POLICY "update_own_or_hr_employee_docs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.employees WHERE profile_id = auth.uid()
      )
      OR public.get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

-- Deleting an identity document is an HR action, not a self-service one.
CREATE POLICY "hr_deletes_employee_docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND public.get_user_role() IN ('super_admin', 'hr_admin')
  );

DROP POLICY IF EXISTS "auth_read_reimbursement_receipts"   ON storage.objects;
DROP POLICY IF EXISTS "auth_upload_reimbursement_receipts" ON storage.objects;
DROP POLICY IF EXISTS "auth_update_reimbursement_receipts" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_reimbursement_receipts" ON storage.objects;

CREATE POLICY "read_own_or_finance_receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'reimbursement-receipts'
    AND (
      (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE profile_id = auth.uid()
      )
      OR public.get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin', 'leadership', 'manager')
    )
  );

CREATE POLICY "write_own_receipts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'reimbursement-receipts'
    AND (
      (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE profile_id = auth.uid()
      )
      OR public.get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin')
    )
  );

CREATE POLICY "manage_own_receipts" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'reimbursement-receipts'
    AND (
      (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE profile_id = auth.uid()
      )
      OR public.get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin')
    )
  );

CREATE POLICY "delete_own_or_finance_receipts" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'reimbursement-receipts'
    AND (
      (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE profile_id = auth.uid()
      )
      OR public.get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin')
    )
  );
