import { supabase } from '@/lib/supabase'
import { createBulkNotifications, getProfileIdsByRole } from '@/features/resignation/api/notifications.api'
import type { GeneralRequest, GeneralRequestWithRelations } from '@/types/database.types'

const GENERAL_REQUEST_SELECT = `
  *,
  employee:employees!employee_id(
    id, first_name, last_name, email, employee_code, department_id,
    department:departments!department_id(id, name),
    designation:designations!designation_id(id, title)
  )
`

export interface CreateGeneralRequestData {
  organization_id: string
  employee_id: string
  requested_by: string
  request_type: GeneralRequest['request_type']
  title: string
  description?: string
  custom_fields?: Record<string, any>
}

export async function createGeneralRequest(data: CreateGeneralRequestData) {
  const { data: request, error } = await supabase
    .from('general_requests')
    .insert({
      organization_id: data.organization_id,
      employee_id: data.employee_id,
      requested_by: data.requested_by,
      request_type: data.request_type,
      title: data.title,
      description: data.description || null,
      custom_fields: data.custom_fields || {},
      status: 'pending_manager' as const,
    })
    .select(GENERAL_REQUEST_SELECT)
    .single()
  if (error) throw error

  // Notify manager
  try {
    const { data: employee } = await supabase
      .from('employees')
      .select('first_name, last_name, reporting_manager_id')
      .eq('id', data.employee_id)
      .single()
    const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'An employee'

    if (employee?.reporting_manager_id) {
      const { data: manager } = await supabase
        .from('employees')
        .select('profile_id')
        .eq('id', employee.reporting_manager_id)
        .single()
      if (manager?.profile_id) {
        await createBulkNotifications([{
          organization_id: data.organization_id,
          recipient_profile_id: manager.profile_id,
          type: 'general' as const,
          title: 'Request Approval Required',
          message: `${employeeName} has submitted a ${data.title}. Please review.`,
          reference_id: request.id,
          reference_type: 'general_request',
        }])
      }
    }
  } catch { /* best-effort */ }

  return request as GeneralRequestWithRelations
}

export async function getMyGeneralRequests(employeeId: string) {
  const { data, error } = await supabase
    .from('general_requests')
    .select(GENERAL_REQUEST_SELECT)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as GeneralRequestWithRelations[]
}

export async function getGeneralRequestsForApproval(orgId: string) {
  const { data, error } = await supabase
    .from('general_requests')
    .select(GENERAL_REQUEST_SELECT)
    .eq('organization_id', orgId)
    .in('status', ['pending_manager', 'manager_approved', 'pending_hr'])
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as GeneralRequestWithRelations[]
}

export async function getAllGeneralRequests(orgId: string) {
  const { data, error } = await supabase
    .from('general_requests')
    .select(GENERAL_REQUEST_SELECT)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as GeneralRequestWithRelations[]
}

export async function approveGeneralRequestManager(
  requestId: string,
  approverEmployeeId: string,
  remarks?: string
) {
  // First fetch the request to check type
  const { data: existing } = await supabase
    .from('general_requests')
    .select('request_type, organization_id, employee_id')
    .eq('id', requestId)
    .single()

  // asset_request needs HR approval too; others go straight to completed
  const nextStatus = existing?.request_type === 'asset_request' ? 'pending_hr' : 'completed'

  const { data, error } = await supabase
    .from('general_requests')
    .update({
      status: nextStatus as any,
      manager_approved_by: approverEmployeeId,
      manager_approved_at: new Date().toISOString(),
      manager_remarks: remarks || null,
    })
    .eq('id', requestId)
    .select(GENERAL_REQUEST_SELECT)
    .single()
  if (error) throw error

  try {
    const req = data as GeneralRequestWithRelations
    const empName = req.employee ? `${req.employee.first_name} ${req.employee.last_name}` : 'An employee'

    if (nextStatus === 'pending_hr') {
      // Notify HR
      const hrProfileIds = await getProfileIdsByRole(req.organization_id, ['hr_admin', 'super_admin'])
      await createBulkNotifications(
        hrProfileIds.map(pid => ({
          organization_id: req.organization_id,
          recipient_profile_id: pid,
          type: 'general' as const,
          title: 'Asset Request Pending HR Approval',
          message: `${empName}'s ${req.title} has been approved by manager. Please review.`,
          reference_id: req.id,
          reference_type: 'general_request',
        }))
      )
    } else {
      // Notify employee of completion
      const { data: empProfile } = await supabase
        .from('employees')
        .select('profile_id')
        .eq('id', req.employee_id)
        .single()
      if (empProfile?.profile_id) {
        await createBulkNotifications([{
          organization_id: req.organization_id,
          recipient_profile_id: empProfile.profile_id,
          type: 'general' as const,
          title: 'Request Approved',
          message: `Your ${req.title} has been approved.`,
          reference_id: req.id,
          reference_type: 'general_request',
        }])
      }
    }
  } catch { /* best-effort */ }

  return data as GeneralRequestWithRelations
}

export async function approveGeneralRequestHR(
  requestId: string,
  approverEmployeeId: string,
  remarks?: string
) {
  const { data, error } = await supabase
    .from('general_requests')
    .update({
      status: 'completed' as any,
      hr_approved_by: approverEmployeeId,
      hr_approved_at: new Date().toISOString(),
      hr_remarks: remarks || null,
    })
    .eq('id', requestId)
    .select(GENERAL_REQUEST_SELECT)
    .single()
  if (error) throw error

  // Notify employee
  try {
    const req = data as GeneralRequestWithRelations
    const { data: empProfile } = await supabase
      .from('employees')
      .select('profile_id')
      .eq('id', req.employee_id)
      .single()
    if (empProfile?.profile_id) {
      await createBulkNotifications([{
        organization_id: req.organization_id,
        recipient_profile_id: empProfile.profile_id,
        type: 'general' as const,
        title: 'Request Approved',
        message: `Your ${req.title} has been approved by HR.`,
        reference_id: req.id,
        reference_type: 'general_request',
      }])
    }
  } catch { /* best-effort */ }

  return data as GeneralRequestWithRelations
}

export async function rejectGeneralRequest(
  requestId: string,
  rejectorEmployeeId: string,
  remarks: string,
  level: 'manager' | 'hr'
) {
  const updateData = level === 'manager'
    ? {
        status: 'manager_rejected' as const,
        manager_approved_by: rejectorEmployeeId,
        manager_approved_at: new Date().toISOString(),
        manager_remarks: remarks,
      }
    : {
        status: 'hr_rejected' as const,
        hr_approved_by: rejectorEmployeeId,
        hr_approved_at: new Date().toISOString(),
        hr_remarks: remarks,
      }

  const { data, error } = await supabase
    .from('general_requests')
    .update(updateData)
    .eq('id', requestId)
    .select(GENERAL_REQUEST_SELECT)
    .single()
  if (error) throw error

  // Notify employee
  try {
    const req = data as GeneralRequestWithRelations
    const { data: empProfile } = await supabase
      .from('employees')
      .select('profile_id')
      .eq('id', req.employee_id)
      .single()
    if (empProfile?.profile_id) {
      await createBulkNotifications([{
        organization_id: req.organization_id,
        recipient_profile_id: empProfile.profile_id,
        type: 'general' as const,
        title: 'Request Rejected',
        message: `Your ${req.title} has been rejected by ${level === 'manager' ? 'your manager' : 'HR'}. Reason: ${remarks}`,
        reference_id: req.id,
        reference_type: 'general_request',
      }])
    }
  } catch { /* best-effort */ }

  return data as GeneralRequestWithRelations
}
