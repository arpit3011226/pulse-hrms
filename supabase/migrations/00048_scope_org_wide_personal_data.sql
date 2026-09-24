-- The rest of P7-6: tables holding personal data that any signed-in member of the
-- organisation could read in full.
--
-- Reference data — departments, holidays, leave types, shifts, letter templates,
-- policies, announcements — stays open, because everyone needs it. What changes
-- here is the records that belong to a particular person.
--
-- The line drawn, matching what leave_requests already did:
--   * operational records follow the reporting line — your own, plus your team's
--   * money and anything about why someone left follow the role instead
--
-- manages_employee() is the reporting line, not the 'manager' role. Plenty of
-- people who manage somebody carry the plain employee role in this system, and
-- their team's attendance is their job either way.

-- ── Attendance ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS read_attendance ON attendance_records;
CREATE POLICY read_attendance ON attendance_records
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR manages_employee(employee_id)
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS read_org_regularizations ON attendance_regularization_requests;
CREATE POLICY read_org_regularizations ON attendance_regularization_requests
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR manages_employee(employee_id)
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

-- ── Leave attachments ───────────────────────────────────────────────────────
-- Usually a medical certificate. Follows the leave request it belongs to, so
-- whoever may see the request may see its attachment and nobody else.

DROP POLICY IF EXISTS read_leave_attachments ON leave_attachments;
CREATE POLICY read_leave_attachments ON leave_attachments
  FOR SELECT USING (
    leave_request_id IN (SELECT id FROM leave_requests)
  );

DROP POLICY IF EXISTS read_carry_forward_logs ON leave_carry_forward_logs;
CREATE POLICY read_carry_forward_logs ON leave_carry_forward_logs
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR manages_employee(employee_id)
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

-- An accrual run is an administrative job, not something an employee needs.
DROP POLICY IF EXISTS read_accrual_runs ON leave_accrual_runs;
CREATE POLICY read_accrual_runs ON leave_accrual_runs
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

-- ── Employment history ──────────────────────────────────────────────────────
-- Status history carries the reason somebody was terminated, so it stays with
-- the person, HR, admin and leadership — not with their manager.

DROP POLICY IF EXISTS org_read_status_history ON employee_status_history;
CREATE POLICY org_read_status_history ON employee_status_history
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS org_read_org_history ON employee_org_history;
CREATE POLICY org_read_org_history ON employee_org_history
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR manages_employee(employee_id)
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS org_read_work_profiles ON employee_work_profiles;
CREATE POLICY org_read_work_profiles ON employee_work_profiles
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR manages_employee(employee_id)
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

-- ── Leaving ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS org_read_clearances ON exit_clearances;
CREATE POLICY org_read_clearances ON exit_clearances
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR manages_employee(employee_id)
      OR cleared_by IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

-- ── Joining ─────────────────────────────────────────────────────────────────
-- A check-in holds notes written about a new joiner by their manager.

DROP POLICY IF EXISTS read_onb_journeys ON onboarding_journeys;
CREATE POLICY read_onb_journeys ON onboarding_journeys
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_onboarding_id IN (SELECT id FROM employee_onboarding)
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

-- ── Administrative trails ───────────────────────────────────────────────────

DROP POLICY IF EXISTS read_org_activity ON activity_log;
CREATE POLICY read_org_activity ON activity_log
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      user_id = auth.uid()
      OR get_user_role() IN ('super_admin', 'hr_admin')
    )
  );

DROP POLICY IF EXISTS org_read_workflow_runs ON workflow_runs;
CREATE POLICY org_read_workflow_runs ON workflow_runs
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

-- ── Payroll administration ──────────────────────────────────────────────────
-- 00036 gave these a FOR clause; they were still readable by everyone.

DROP POLICY IF EXISTS org_reads_payroll_approvals ON payroll_approvals;
CREATE POLICY org_reads_payroll_approvals ON payroll_approvals
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      approver_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS org_reads_payroll_config ON payroll_config;
CREATE POLICY org_reads_payroll_config ON payroll_config
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'payroll_admin', 'leadership')
  );
