import { supabase } from '@/lib/supabase'
import { createBulkNotifications, getProfileIdsByRole } from '@/features/resignation/api/notifications.api'
import type { ReimbursementRequest, ReimbursementRequestWithRelations } from '@/types/database.types'

const REIMBURSEMENT_SELECT = `
  *,
  employee:employees!employee_id(
    id, first_name, last_name, email, employee_code, department_id,
    department:departments!department_id(id, name),
    designation:designations!designation_id(id, title)
  )
`

export interface CreateReimbursementData {
  organization_id: string
  employee_id: string
  requested_by: string
  category: ReimbursementRequest['category']
  amount: number
  description: string
  expense_date: string
  receipt_url?: string | null
}

export async function createReimbursement(data: CreateReimbursementData) {
  const { data: request, error } = await supabase
    .from('reimbursement_requests')
    .insert({
      organization_id: data.organization_id,
      employee_id: data.employee_id,
      requested_by: data.requested_by,
      category: data.category,
      amount: data.amount,
      description: data.description,
      expense_date: data.expense_date,
      receipt_url: data.receipt_url || null,
      status: 'pending_manager' as const,
    })
    .select(REIMBURSEMENT_SELECT)
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
          title: 'Reimbursement Approval Required',
          message: `${employeeName} has submitted a reimbursement request for ₹${data.amount}. Please review.`,
          reference_id: request.id,
          reference_type: 'reimbursement_request',
        }])
      }
    }
  } catch { /* best-effort */ }

  return request as ReimbursementRequestWithRelations
}

export async function getMyReimbursements(employeeId: string) {
  const { data, error } = await supabase
    .from('reimbursement_requests')
    .select(REIMBURSEMENT_SELECT)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as ReimbursementRequestWithRelations[]
}

export async function getReimbursementsForApproval(orgId: string) {
  const { data, error } = await supabase
    .from('reimbursement_requests')
    .select(REIMBURSEMENT_SELECT)
    .eq('organization_id', orgId)
    .in('status', ['pending_manager', 'manager_approved', 'pending_finance'])
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as ReimbursementRequestWithRelations[]
}

export async function getAllReimbursements(orgId: string) {
  const { data, error } = await supabase
    .from('reimbursement_requests')
    .select(REIMBURSEMENT_SELECT)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as ReimbursementRequestWithRelations[]
}

export async function approveReimbursementManager(
  requestId: string,
  approverEmployeeId: string,
  remarks?: string
) {
  const { data, error } = await supabase
    .from('reimbursement_requests')
    .update({
      status: 'pending_finance' as const,
      manager_approved_by: approverEmployeeId,
      manager_approved_at: new Date().toISOString(),
      manager_remarks: remarks || null,
    })
    .eq('id', requestId)
    .select(REIMBURSEMENT_SELECT)
    .single()
  if (error) throw error

  // Notify payroll admins
  try {
    const req = data as ReimbursementRequestWithRelations
    const financeProfileIds = await getProfileIdsByRole(req.organization_id, ['payroll_admin', 'super_admin'])
    const empName = req.employee ? `${req.employee.first_name} ${req.employee.last_name}` : 'An employee'
    await createBulkNotifications(
      financeProfileIds.map(pid => ({
        organization_id: req.organization_id,
        recipient_profile_id: pid,
        type: 'general' as const,
        title: 'Reimbursement Pending Finance Approval',
        message: `${empName}'s reimbursement of ₹${req.amount} has been approved by manager. Please review.`,
        reference_id: req.id,
        reference_type: 'reimbursement_request',
      }))
    )
  } catch { /* best-effort */ }

  return data as ReimbursementRequestWithRelations
}

export async function approveReimbursementFinance(
  requestId: string,
  approverEmployeeId: string,
  remarks?: string
) {
  const { data, error } = await supabase
    .from('reimbursement_requests')
    .update({
      status: 'completed' as const,
      finance_approved_by: approverEmployeeId,
      finance_approved_at: new Date().toISOString(),
      finance_remarks: remarks || null,
    })
    .eq('id', requestId)
    .select(REIMBURSEMENT_SELECT)
    .single()
  if (error) throw error

  // Notify employee
  try {
    const req = data as ReimbursementRequestWithRelations
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
        title: 'Reimbursement Approved',
        message: `Your reimbursement of ₹${req.amount} has been approved by finance.`,
        reference_id: req.id,
        reference_type: 'reimbursement_request',
      }])
    }
  } catch { /* best-effort */ }

  return data as ReimbursementRequestWithRelations
}

export async function rejectReimbursement(
  requestId: string,
  rejectorEmployeeId: string,
  remarks: string,
  level: 'manager' | 'finance'
) {
  const updateData = level === 'manager'
    ? {
        status: 'manager_rejected' as const,
        manager_approved_by: rejectorEmployeeId,
        manager_approved_at: new Date().toISOString(),
        manager_remarks: remarks,
      }
    : {
        status: 'finance_rejected' as const,
        finance_approved_by: rejectorEmployeeId,
        finance_approved_at: new Date().toISOString(),
        finance_remarks: remarks,
      }

  const { data, error } = await supabase
    .from('reimbursement_requests')
    .update(updateData)
    .eq('id', requestId)
    .select(REIMBURSEMENT_SELECT)
    .single()
  if (error) throw error

  // Notify employee
  try {
    const req = data as ReimbursementRequestWithRelations
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
        title: 'Reimbursement Rejected',
        message: `Your reimbursement of ₹${req.amount} has been rejected by ${level === 'manager' ? 'your manager' : 'finance'}. Reason: ${remarks}`,
        reference_id: req.id,
        reference_type: 'reimbursement_request',
      }])
    }
  } catch { /* best-effort */ }

  return data as ReimbursementRequestWithRelations
}
