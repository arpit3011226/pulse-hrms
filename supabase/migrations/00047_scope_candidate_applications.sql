-- Applications were org-wide readable, so an interviewer could see every
-- application in the pipeline rather than the ones they were part of. Found
-- while testing 00046: after a candidate was hired the panel correctly lost the
-- candidate's contact details but could still read all four applications.
--
-- An interviewer keeps sight of the application they interviewed for, including
-- its outcome, which is what the business asked for. They do not see the rest.

DROP POLICY IF EXISTS "Org members can read candidate_applications" ON candidate_applications;

-- Did I interview for this application? No status condition: the panel is meant
-- to keep the outcome of the interviews they took part in.
CREATE OR REPLACE FUNCTION interviewed_for_application(p_application_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM interviews i
    WHERE i.candidate_application_id = p_application_id
      AND i.interviewer_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.interviewed_for_application(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.interviewed_for_application(UUID) TO authenticated;

DROP POLICY IF EXISTS read_applications_scoped ON candidate_applications;
CREATE POLICY read_applications_scoped ON candidate_applications
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
      OR manages_hiring_for_application(id)
      OR interviewed_for_application(id)
    )
  );
