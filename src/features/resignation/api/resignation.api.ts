import { supabase } from '@/lib/supabase'
import { createBulkNotifications, getProfileIdsByRole } from './notifications.api'
import type { EmployeeExitRecord } from '@/types/database.types'

// ============================================================================
// TYPES
// ============================================================================

export interface SubmitResignationData {
  organization_id: string
  employee_id: string
  resignation_date: string
  exit_reason: string
  notice_period_days: number
  last_working_date: string
  initiated_by: string // profile_id of submitter
  exit_type?: EmployeeExitRecord['exit_type']
}

export interface ResignationFilters {
  approval_status?: EmployeeExitRecord['approval_status']
}

// ============================================================================
// SUBMIT RESIGNATION
// ============================================================================

export async function submitResignation(data: SubmitResignationData) {
  const { data: exitRecord, error } = await supabase
    .from('employee_exit_records')
    .insert({
      organization_id: data.organization_id,
      employee_id: data.employee_id,
      resignation_date: data.resignation_date,
      exit_reason: data.exit_reason,
      notice_period_days: data.notice_period_days,
      last_working_date: data.last_working_date,
      exit_type: data.exit_type || 'resignation',
      status: 'initiated' as const,
      approval_status: 'submitted' as const,
      initiated_by: data.initiated_by,
      clearance_status: 'pending' as const,
      regretted_attrition: false,
      exit_interview_done: false,
    })
    .select()
    .single()
  if (error) throw error

  // Send notifications
  try {
    // Get employee name
    const { data: employee } = await supabase
      .from('employees')
      .select('first_name, last_name, reporting_manager_id')
      .eq('id', data.employee_id)
      .single()

    const employeeName = employee
      ? `${employee.first_name} ${employee.last_name}`
      : 'An employee'

    const recipientProfileIds: string[] = []

    // Get reporting manager's profile_id
    if (employee?.reporting_manager_id) {
      const { data: manager } = await supabase
        .from('employees')
        .select('profile_id')
        .eq('id', employee.reporting_manager_id)
        .single()
      if (manager?.profile_id) {
        recipientProfileIds.push(manager.profile_id)
      }
    }

    // Get hr_admin + super_admin + leadership profile_ids
    const adminProfileIds = await getProfileIdsByRole(data.organization_id, [
      'hr_admin',
      'super_admin',
      'leadership',
    ])
    for (const pid of adminProfileIds) {
      if (!recipientProfileIds.includes(pid)) {
        recipientProfileIds.push(pid)
      }
    }

    if (recipientProfileIds.length > 0) {
      await createBulkNotifications(
        recipientProfileIds.map((pid) => ({
          organization_id: data.organization_id,
          recipient_profile_id: pid,
          type: 'resignation_submitted' as const,
          title: 'Resignation Submitted',
          message: `${employeeName} has submitted a resignation request.`,
          reference_id: exitRecord.id,
          reference_type: 'exit_record',
        }))
      )
    }
  } catch {
    // Notification failure should not block the resignation submission
    console.error('Failed to send resignation notifications')
  }

  return exitRecord as EmployeeExitRecord
}

// ============================================================================
// GET RESIGNATION REQUESTS
// ============================================================================

export async function getResignationRequests(orgId: string, filters?: ResignationFilters) {
  let query = supabase
    .from('employee_exit_records')
    .select(`
      *,
      employee:employees!employee_id(
        id, first_name, last_name, employee_code, email,
        department:departments!department_id(name),
        designation:designations!designation_id(title)
      )
    `)
    .eq('organization_id', orgId)
    .eq('exit_type', 'resignation')

  if (filters?.approval_status) {
    query = query.eq('approval_status', filters.approval_status)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ============================================================================
// GET MY RESIGNATION
// ============================================================================

export async function getMyResignation(employeeId: string) {
  const { data, error } = await supabase
    .from('employee_exit_records')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('exit_type', 'resignation')
    .not('approval_status', 'eq', 'withdrawn')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as EmployeeExitRecord | null
}

// ============================================================================
// GET PENDING MANAGER APPROVALS
// ============================================================================

export async function getPendingManagerApprovals(managerId: string | string[]) {
  // First get employees who report to this manager
  const { data: directReports, error: empError } = await supabase
    .from('employees')
    .select('id')
    .in('reporting_manager_id', Array.isArray(managerId) ? managerId : [managerId])
  if (empError) throw empError

  if (!directReports || directReports.length === 0) return []

  const employeeIds = directReports.map((e) => e.id)

  const { data, error } = await supabase
    .from('employee_exit_records')
    .select(`
      *,
      employee:employees!employee_id(
        id, first_name, last_name, employee_code, email,
        department:departments!department_id(name),
        designation:designations!designation_id(title)
      )
    `)
    .in('employee_id', employeeIds)
    .eq('approval_status', 'submitted')
    .eq('exit_type', 'resignation')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ============================================================================
// GET PENDING HR APPROVALS
// ============================================================================

export async function getPendingHRApprovals(orgId: string) {
  const { data, error } = await supabase
    .from('employee_exit_records')
    .select(`
      *,
      employee:employees!employee_id(
        id, first_name, last_name, employee_code, email,
        department:departments!department_id(name),
        designation:designations!designation_id(title)
      )
    `)
    .eq('organization_id', orgId)
    .eq('approval_status', 'manager_approved')
    .eq('exit_type', 'resignation')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ============================================================================
// APPROVE RESIGNATION — MANAGER
// ============================================================================

export async function approveResignationManager(
  exitRecordId: string,
  approverEmployeeId: string,
  remarks?: string
) {
  const { data: exitRecord, error } = await supabase
    .from('employee_exit_records')
    .update({
      approval_status: 'manager_approved' as const,
      manager_approved_by: approverEmployeeId,
      manager_approved_at: new Date().toISOString(),
      manager_remarks: remarks || null,
    })
    .eq('id', exitRecordId)
    .select()
    .single()
  if (error) throw error

  // Send notifications
  try {
    const orgId = exitRecord.organization_id
    const recipientProfileIds: string[] = []

    // Get the employee's profile_id
    const { data: employee } = await supabase
      .from('employees')
      .select('profile_id, first_name, last_name')
      .eq('id', exitRecord.employee_id)
      .single()

    if (employee?.profile_id) {
      recipientProfileIds.push(employee.profile_id)
    }

    const employeeName = employee
      ? `${employee.first_name} ${employee.last_name}`
      : 'An employee'

    // Get HR admin profile_ids
    const hrProfileIds = await getProfileIdsByRole(orgId, ['hr_admin', 'super_admin'])
    for (const pid of hrProfileIds) {
      if (!recipientProfileIds.includes(pid)) {
        recipientProfileIds.push(pid)
      }
    }

    const notifications = []

    // Notify employee
    if (employee?.profile_id) {
      notifications.push({
        organization_id: orgId,
        recipient_profile_id: employee.profile_id,
        type: 'resignation_manager_approved' as const,
        title: 'Resignation Approved by Manager',
        message: 'Your resignation has been approved by your manager. It is now pending HR approval.',
        reference_id: exitRecordId,
        reference_type: 'exit_record',
      })
    }

    // Notify HR admins
    for (const pid of hrProfileIds) {
      notifications.push({
        organization_id: orgId,
        recipient_profile_id: pid,
        type: 'resignation_manager_approved' as const,
        title: 'Resignation Pending HR Approval',
        message: `${employeeName}'s resignation has been approved by their manager and is pending HR approval.`,
        reference_id: exitRecordId,
        reference_type: 'exit_record',
      })
    }

    if (notifications.length > 0) {
      await createBulkNotifications(notifications)
    }
  } catch {
    console.error('Failed to send manager approval notifications')
  }

  return exitRecord as EmployeeExitRecord
}

// ============================================================================
// APPROVE RESIGNATION — HR
// ============================================================================

export async function approveResignationHR(
  exitRecordId: string,
  approverEmployeeId: string,
  remarks?: string,
  overrideLastWorkingDate?: string
) {
  const updatePayload: Partial<EmployeeExitRecord> = {
    approval_status: 'hr_approved',
    hr_approved_by: approverEmployeeId,
    hr_approved_at: new Date().toISOString(),
    hr_remarks: remarks || null,
    status: 'notice_period',
  }

  if (overrideLastWorkingDate) {
    updatePayload.last_working_date = overrideLastWorkingDate
    updatePayload.hr_override_last_working_date = overrideLastWorkingDate
  }

  const { data: exitRecord, error } = await supabase
    .from('employee_exit_records')
    .update(updatePayload)
    .eq('id', exitRecordId)
    .select()
    .single()
  if (error) throw error

  const orgId = exitRecord.organization_id

  // Update employee status to on_notice
  const { data: employee } = await supabase
    .from('employees')
    .select('id, profile_id, first_name, last_name, status, reporting_manager_id')
    .eq('id', exitRecord.employee_id)
    .single()

  if (employee) {
    const previousStatus = employee.status || 'active'

    await supabase
      .from('employees')
      .update({ status: 'on_notice' })
      .eq('id', employee.id)

    // Insert status history
    await supabase.from('employee_status_history').insert({
      organization_id: orgId,
      employee_id: employee.id,
      previous_status: previousStatus,
      new_status: 'on_notice',
      changed_by: approverEmployeeId,
      reason: 'Resignation approved by HR',
    })
  }

  // Create exit clearances for Finance, HR, IT
  const clearanceDepartments = ['Finance', 'HR', 'IT']
  const clearanceInserts = clearanceDepartments.map((dept) => ({
    organization_id: orgId,
    exit_record_id: exitRecordId,
    employee_id: exitRecord.employee_id,
    department_name: dept,
    clearance_status: 'pending' as const,
  }))

  await supabase.from('exit_clearances').insert(clearanceInserts)

  // Send notifications
  try {
    const notifications = []
    const employeeName = employee
      ? `${employee.first_name} ${employee.last_name}`
      : 'An employee'

    // Notify employee
    if (employee?.profile_id) {
      notifications.push({
        organization_id: orgId,
        recipient_profile_id: employee.profile_id,
        type: 'resignation_hr_approved' as const,
        title: 'Resignation Approved by HR',
        message: 'Your resignation has been approved by HR. You are now in the notice period.',
        reference_id: exitRecordId,
        reference_type: 'exit_record',
      })
    }

    // Notify manager
    if (employee?.reporting_manager_id) {
      const { data: manager } = await supabase
        .from('employees')
        .select('profile_id')
        .eq('id', employee.reporting_manager_id)
        .single()

      if (manager?.profile_id) {
        notifications.push({
          organization_id: orgId,
          recipient_profile_id: manager.profile_id,
          type: 'resignation_hr_approved' as const,
          title: 'Resignation HR Approved',
          message: `${employeeName}'s resignation has been approved by HR. Notice period has begun.`,
          reference_id: exitRecordId,
          reference_type: 'exit_record',
        })
      }
    }

    if (notifications.length > 0) {
      await createBulkNotifications(notifications)
    }
  } catch {
    console.error('Failed to send HR approval notifications')
  }

  return exitRecord as EmployeeExitRecord
}

// ============================================================================
// REJECT RESIGNATION
// ============================================================================

export async function rejectResignation(
  exitRecordId: string,
  rejectorEmployeeId: string,
  remarks: string,
  level: 'manager' | 'hr'
) {
  const updatePayload: Partial<EmployeeExitRecord> = {
    approval_status: level === 'manager' ? 'manager_rejected' : 'hr_rejected',
  }

  if (level === 'manager') {
    updatePayload.manager_approved_by = rejectorEmployeeId
    updatePayload.manager_approved_at = new Date().toISOString()
    updatePayload.manager_remarks = remarks
  } else {
    updatePayload.hr_approved_by = rejectorEmployeeId
    updatePayload.hr_approved_at = new Date().toISOString()
    updatePayload.hr_remarks = remarks
  }

  const { data: exitRecord, error } = await supabase
    .from('employee_exit_records')
    .update(updatePayload)
    .eq('id', exitRecordId)
    .select()
    .single()
  if (error) throw error

  // Notify employee
  try {
    const { data: employee } = await supabase
      .from('employees')
      .select('profile_id')
      .eq('id', exitRecord.employee_id)
      .single()

    if (employee?.profile_id) {
      await createBulkNotifications([
        {
          organization_id: exitRecord.organization_id,
          recipient_profile_id: employee.profile_id,
          type: 'resignation_rejected' as const,
          title: 'Resignation Rejected',
          message: `Your resignation has been rejected by ${level === 'manager' ? 'your manager' : 'HR'}. Reason: ${remarks}`,
          reference_id: exitRecordId,
          reference_type: 'exit_record',
        },
      ])
    }
  } catch {
    console.error('Failed to send rejection notification')
  }

  return exitRecord as EmployeeExitRecord
}

// ============================================================================
// WITHDRAW RESIGNATION
// ============================================================================

export async function withdrawResignation(exitRecordId: string) {
  const { data, error } = await supabase
    .from('employee_exit_records')
    .update({
      approval_status: 'withdrawn' as const,
      status: 'withdrawn' as const,
    })
    .eq('id', exitRecordId)
    .select()
    .single()
  if (error) throw error
  return data as EmployeeExitRecord
}

/**
 * Relieve somebody: the last step of an exit.
 *
 * Marking the record complete is what sets the employee's status and leaving
 * date and turns their login into an alumni login — a trigger does all three
 * together, so they cannot drift apart (migration 00051).
 */
export async function completeExit(exitRecordId: string) {
  const { data, error } = await supabase
    .from('employee_exit_records')
    .update({ status: 'completed' })
    .eq('id', exitRecordId)
    .select()
    .single()
  if (error) throw error
  return data
}
