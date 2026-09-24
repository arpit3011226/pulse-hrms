-- A candidate could read the whole staff list.
--
-- `org_members_read_employees` only asked that you belong to the organisation.
-- A candidate's profile carries the organisation id so they can see their own
-- application, which meant a person who had merely applied for a job could read
-- every employee's name, work email, phone number, code and designation.
-- Verified before this migration: 11 of 11 rows.
--
-- Alumni were in the same position. Somebody who left last year does not need
-- the current staff directory either.
--
-- Both keep their own row, because that is how their own screens find them.

DROP POLICY IF EXISTS org_members_read_employees ON employees;
CREATE POLICY org_members_read_employees ON employees
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      profile_id = auth.uid()
      OR get_user_role() NOT IN ('candidate', 'alumni')
    )
  );

-- Requisitions were org-wide too, so a candidate could read every open role and
-- its headcount and status. They keep the ones they actually applied for, which
-- is what their portal shows them.
DROP POLICY IF EXISTS "Org members can read job_requisitions" ON job_requisitions;

DROP POLICY IF EXISTS read_requisitions_scoped ON job_requisitions;
CREATE POLICY read_requisitions_scoped ON job_requisitions
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      get_user_role() NOT IN ('candidate', 'alumni')
      OR id IN (
        SELECT ca.job_requisition_id
        FROM candidate_applications ca
        JOIN candidates c ON c.id = ca.candidate_id
        WHERE c.profile_id = auth.uid()
      )
    )
  );
