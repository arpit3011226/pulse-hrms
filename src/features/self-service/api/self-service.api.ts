import { supabase } from '@/lib/supabase'
import { createBulkNotifications, getProfileIdsByRole } from '@/features/resignation/api/notifications.api'
import type { LetterTemplate, LetterRequest, LetterRequestWithRelations } from '@/types/database.types'

// ============================================================================
// LETTER TEMPLATES
// ============================================================================

export async function getLetterTemplates(orgId: string) {
  const { data, error } = await supabase
    .from('letter_templates')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('category')
  if (error) throw error
  return data as LetterTemplate[]
}

export async function getLetterTemplate(templateId: string) {
  const { data, error } = await supabase
    .from('letter_templates')
    .select('*')
    .eq('id', templateId)
    .single()
  if (error) throw error
  return data as LetterTemplate
}

export async function createLetterTemplate(data: Omit<LetterTemplate, 'id' | 'created_at' | 'updated_at'>) {
  const { data: template, error } = await supabase
    .from('letter_templates')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return template as LetterTemplate
}

export async function updateLetterTemplate(templateId: string, data: Partial<LetterTemplate>) {
  const { data: template, error } = await supabase
    .from('letter_templates')
    .update(data)
    .eq('id', templateId)
    .select()
    .single()
  if (error) throw error
  return template as LetterTemplate
}

export async function deleteLetterTemplate(templateId: string) {
  const { error } = await supabase
    .from('letter_templates')
    .update({ is_active: false })
    .eq('id', templateId)
  if (error) throw error
}

// ============================================================================
// LETTER REQUESTS
// ============================================================================

const LETTER_REQUEST_SELECT = `
  *,
  template:letter_templates!template_id(*),
  employee:employees!employee_id(
    id, first_name, last_name, email, employee_code, department_id,
    date_of_joining, date_of_leaving,
    department:departments!department_id(id, name),
    designation:designations!designation_id(id, title),
    statutory:employee_statutory(pan_number),
    personal:employee_personal(current_address)
  )
`

export interface RequestLetterData {
  organization_id: string
  template_id: string
  employee_id: string
  requested_by: string
  remarks?: string
  custom_fields?: Record<string, string>
}

export async function requestLetter(data: RequestLetterData) {
  // Fetch the template to know the approval type
  const template = await getLetterTemplate(data.template_id)

  let status: LetterRequest['status'] = 'draft'
  if (template.approval_type === 'auto') {
    status = 'completed'
  } else if (template.approval_type === 'approval_required') {
    status = 'pending_manager'
  } else if (template.approval_type === 'hr_only') {
    status = 'completed'
  }

  const { data: request, error } = await supabase
    .from('letter_requests')
    .insert({
      organization_id: data.organization_id,
      template_id: data.template_id,
      employee_id: data.employee_id,
      requested_by: data.requested_by,
      status,
      remarks: data.remarks || null,
      custom_fields: data.custom_fields || {},
    })
    .select(LETTER_REQUEST_SELECT)
    .single()
  if (error) throw error

  // Send notifications
  try {
    const { data: employee } = await supabase
      .from('employees')
      .select('first_name, last_name')
      .eq('id', data.employee_id)
      .single()
    const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'An employee'

    if (template.approval_type === 'auto' || template.approval_type === 'hr_only') {
      // Notify HR that a letter was generated
      const hrProfileIds = await getProfileIdsByRole(data.organization_id, ['hr_admin', 'super_admin'])
      await createBulkNotifications(
        hrProfileIds.map(pid => ({
          organization_id: data.organization_id,
          recipient_profile_id: pid,
          type: 'general' as const,
          title: 'Letter Generated',
          message: `${employeeName} generated a ${template.name}.`,
          reference_id: request.id,
          reference_type: 'letter_request',
        }))
      )
    } else if (template.approval_type === 'approval_required') {
      // Notify manager
      const { data: emp } = await supabase
        .from('employees')
        .select('reporting_manager_id')
        .eq('id', data.employee_id)
        .single()
      if (emp?.reporting_manager_id) {
        const { data: manager } = await supabase
          .from('employees')
          .select('profile_id')
          .eq('id', emp.reporting_manager_id)
          .single()
        if (manager?.profile_id) {
          await createBulkNotifications([{
            organization_id: data.organization_id,
            recipient_profile_id: manager.profile_id,
            type: 'general' as const,
            title: 'Letter Approval Required',
            message: `${employeeName} has requested a ${template.name}. Please review.`,
            reference_id: request.id,
            reference_type: 'letter_request',
          }])
        }
      }
    }
  } catch {
    // Notifications are best-effort
  }

  return request as LetterRequestWithRelations
}

export async function getMyLetterRequests(employeeId: string) {
  const { data, error } = await supabase
    .from('letter_requests')
    .select(LETTER_REQUEST_SELECT)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as LetterRequestWithRelations[]
}

export async function getLetterRequestsForApproval(orgId: string) {
  const { data, error } = await supabase
    .from('letter_requests')
    .select(LETTER_REQUEST_SELECT)
    .eq('organization_id', orgId)
    .in('status', ['pending_manager', 'manager_approved', 'pending_hr'])
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as LetterRequestWithRelations[]
}

export async function getAllLetterRequests(orgId: string) {
  const { data, error } = await supabase
    .from('letter_requests')
    .select(LETTER_REQUEST_SELECT)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as LetterRequestWithRelations[]
}

// ============================================================================
// APPROVAL ACTIONS
// ============================================================================

export async function approveLetterManager(
  requestId: string,
  approverEmployeeId: string,
  remarks?: string
) {
  const { data, error } = await supabase
    .from('letter_requests')
    .update({
      status: 'pending_hr' as const,
      manager_approved_by: approverEmployeeId,
      manager_approved_at: new Date().toISOString(),
      manager_remarks: remarks || null,
    })
    .eq('id', requestId)
    .select(LETTER_REQUEST_SELECT)
    .single()
  if (error) throw error

  // Notify HR
  try {
    const req = data as LetterRequestWithRelations
    const hrProfileIds = await getProfileIdsByRole(req.organization_id, ['hr_admin', 'super_admin'])
    const empName = req.employee ? `${req.employee.first_name} ${req.employee.last_name}` : 'An employee'
    await createBulkNotifications(
      hrProfileIds.map(pid => ({
        organization_id: req.organization_id,
        recipient_profile_id: pid,
        type: 'general' as const,
        title: 'Letter Pending HR Approval',
        message: `${empName}'s ${req.template?.name || 'letter'} request has been approved by manager. Please review.`,
        reference_id: req.id,
        reference_type: 'letter_request',
      }))
    )
  } catch { /* best-effort */ }

  return data as LetterRequestWithRelations
}

export async function approveLetterHR(
  requestId: string,
  approverEmployeeId: string,
  remarks?: string
) {
  const { data, error } = await supabase
    .from('letter_requests')
    .update({
      status: 'completed' as const,
      hr_approved_by: approverEmployeeId,
      hr_approved_at: new Date().toISOString(),
      hr_remarks: remarks || null,
    })
    .eq('id', requestId)
    .select(LETTER_REQUEST_SELECT)
    .single()
  if (error) throw error

  // Notify employee
  try {
    const req = data as LetterRequestWithRelations
    if (req.employee) {
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
          title: 'Letter Approved',
          message: `Your ${req.template?.name || 'letter'} request has been approved. You can now download it.`,
          reference_id: req.id,
          reference_type: 'letter_request',
        }])
      }
    }
  } catch { /* best-effort */ }

  return data as LetterRequestWithRelations
}

export async function rejectLetter(
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
    .from('letter_requests')
    .update(updateData)
    .eq('id', requestId)
    .select(LETTER_REQUEST_SELECT)
    .single()
  if (error) throw error

  // Notify employee
  try {
    const req = data as LetterRequestWithRelations
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
        title: 'Letter Request Rejected',
        message: `Your ${req.template?.name || 'letter'} request has been rejected by ${level === 'manager' ? 'your manager' : 'HR'}. Reason: ${remarks}`,
        reference_id: req.id,
        reference_type: 'letter_request',
      }])
    }
  } catch { /* best-effort */ }

  return data as LetterRequestWithRelations
}
