-- Leadership can read leave balances across the organisation.
--
-- An open question from the QA pass, decided rather than left hanging.
--
-- Leadership already reads org-wide headcount, attrition and the payroll
-- cost. Leave balance is the same class of number — it is a liability on the
-- books, and the one most likely to arrive as a surprise in March when
-- everybody takes what they are owed at once. Letting leadership see the
-- wage bill but not the leave bill is an odd place to draw the line, and it
-- left the leave report telling them about their own team only.
--
-- Read only. Adjusting a balance stays with HR and the super admin, where it
-- already was. Leadership seeing a number is not the same as leadership
-- changing it.

DROP POLICY IF EXISTS read_own_or_admin_leave_balances ON leave_balances;

CREATE POLICY read_own_or_admin_leave_balances ON leave_balances
  FOR SELECT
  USING (
    employee_id IN (SELECT id FROM employees WHERE organization_id = get_user_org_id())
    AND (
      -- Your own.
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      -- HR runs leave; leadership and the super admin watch the liability.
      OR get_user_role() = ANY (ARRAY[
        'super_admin'::app_role,
        'hr_admin'::app_role,
        'leadership'::app_role
      ])
      -- A manager sees the people who report to them.
      OR employee_id IN (
        SELECT id FROM employees
        WHERE reporting_manager_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      )
    )
  );

COMMENT ON POLICY read_own_or_admin_leave_balances ON leave_balances IS
  'Own balance, your direct reports, or the whole organisation for HR, leadership and the super admin. Changing a balance is a separate policy and stays with HR.';
