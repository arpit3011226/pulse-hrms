import { supabase } from '@/lib/supabase'
import type {
  LeaveType,
  LeavePolicy,
  LeavePolicyDetail,
  LeaveBalance,
  LeaveRequest,
  LeaveRequestDay,
  LeaveEncashmentRequest,
  LeaveBlackoutPeriod,
  Holiday,
} from '@/types/database.types'

// ============================================
// Leave Types
// ============================================

export async function getLeaveTypes(orgId: string) {
  const { data, error } = await supabase
    .from('leave_types')
    .select('*')
    .eq('organization_id', orgId)
    .order('name')
  if (error) throw error
  return data
}

export async function createLeaveType(leaveType: Partial<LeaveType>) {
  const { data, error } = await supabase
    .from('leave_types')
    .insert(leaveType)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateLeaveType(id: string, updates: Partial<LeaveType>) {
  const { data, error } = await supabase
    .from('leave_types')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteLeaveType(id: string) {
  const { error } = await supabase
    .from('leave_types')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw error
}

// ============================================
// Leave Policies
// ============================================

export async function getLeavePolicies(orgId: string) {
  const { data, error } = await supabase
    .from('leave_policies')
    .select('*, leave_policy_details(*, leave_type:leave_types(*))')
    .eq('organization_id', orgId)
    .order('policy_name')
  if (error) throw error
  return data
}

export async function createLeavePolicy(policy: Partial<LeavePolicy>) {
  const { data, error } = await supabase
    .from('leave_policies')
    .insert(policy)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateLeavePolicy(id: string, updates: Partial<LeavePolicy>) {
  const { data, error } = await supabase
    .from('leave_policies')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteLeavePolicy(id: string) {
  const { error } = await supabase
    .from('leave_policies')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw error
}

// ============================================
// Leave Policy Details
// ============================================

export async function createLeavePolicyDetails(details: Partial<LeavePolicyDetail>[]) {
  const { data, error } = await supabase
    .from('leave_policy_details')
    .insert(details)
    .select()
  if (error) throw error
  return data
}

export async function updateLeavePolicyDetail(id: string, updates: Partial<LeavePolicyDetail>) {
  const { data, error } = await supabase
    .from('leave_policy_details')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteLeavePolicyDetails(policyId: string) {
  const { error } = await supabase
    .from('leave_policy_details')
    .delete()
    .eq('leave_policy_id', policyId)
  if (error) throw error
}

// ============================================
// Employee Leave Policy Map
// ============================================

export async function getEmployeeLeavePolicyMap(orgId: string) {
  const { data, error } = await supabase
    .from('employee_leave_policy_map')
    .select('*, employee:employees!employee_leave_policy_map_employee_id_fkey(id, first_name, last_name, email), leave_policy:leave_policies(id, policy_name, policy_code)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function assignLeavePolicy(mapping: {
  organization_id: string
  employee_id: string
  leave_policy_id: string
  effective_from: string
  assigned_by?: string
}) {
  const { data, error } = await supabase
    .from('employee_leave_policy_map')
    .insert(mapping)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function bulkAssignLeavePolicy(mappings: {
  organization_id: string
  employee_id: string
  leave_policy_id: string
  effective_from: string
  assigned_by?: string
}[]) {
  const { data, error } = await supabase
    .from('employee_leave_policy_map')
    .insert(mappings)
    .select()
  if (error) throw error
  return data
}

// ============================================
// Leave Requests
// ============================================

export interface LeaveRequestFilters {
  status?: string
  department_id?: string
  employee_id?: string
  start_date?: string
  end_date?: string
}

export async function getMyLeaveRequests(employeeId: string) {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*, leave_type:leave_types(id, name, code), approver:employees!leave_requests_approved_by_fkey(id, first_name, last_name)')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getTeamLeaveRequests(managerId: string, orgId: string) {
  // Get direct reports' IDs first
  const { data: reports, error: reportsError } = await supabase
    .from('employees')
    .select('id')
    .eq('organization_id', orgId)
    .eq('reporting_manager_id', managerId)
  if (reportsError) throw reportsError

  const reportIds = (reports || []).map((r) => r.id)
  if (reportIds.length === 0) return []

  const { data, error } = await supabase
    .from('leave_requests')
    .select('*, leave_type:leave_types(id, name, code), employee:employees!leave_requests_employee_id_fkey(id, first_name, last_name, email, avatar_url, department_id, department:departments!department_id(id, name))')
    .in('employee_id', reportIds)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getAllLeaveRequests(orgId: string, filters?: LeaveRequestFilters) {
  let query = supabase
    .from('leave_requests')
    .select('*, leave_type:leave_types(id, name, code), employee:employees!leave_requests_employee_id_fkey(id, first_name, last_name, email, avatar_url, department_id, department:departments!department_id(id, name)), approver:employees!leave_requests_approved_by_fkey(id, first_name, last_name)')
    .eq('organization_id', orgId)

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.employee_id) query = query.eq('employee_id', filters.employee_id)
  if (filters?.start_date) query = query.gte('start_date', filters.start_date)
  if (filters?.end_date) query = query.lte('end_date', filters.end_date)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error

  // Filter by department client-side if needed (since department is on employee, not leave_request)
  if (filters?.department_id && data) {
    return data.filter((r: Record<string, unknown>) => {
      const emp = r.employee as { department_id?: string } | null
      return emp?.department_id === filters.department_id
    })
  }

  return data
}

export async function createLeaveRequest(request: Partial<LeaveRequest>) {
  const { data, error } = await supabase
    .from('leave_requests')
    .insert(request)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createLeaveRequestDays(days: Partial<LeaveRequestDay>[]) {
  const { data, error } = await supabase
    .from('leave_request_days')
    .insert(days)
    .select()
  if (error) throw error
  return data
}

export async function updateLeaveRequestStatus(
  id: string,
  status: string,
  approvedBy?: string,
  rejectionReason?: string
) {
  const updates: Partial<LeaveRequest> = { status: status as LeaveRequest['status'] }
  if (approvedBy) {
    updates.approved_by = approvedBy
    updates.approved_at = new Date().toISOString()
  }
  if (rejectionReason) {
    updates.rejection_reason = rejectionReason
  }

  const { data, error } = await supabase
    .from('leave_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function cancelLeaveRequest(id: string) {
  const { data, error } = await supabase
    .from('leave_requests')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getOverlappingLeaves(
  employeeId: string,
  startDate: string,
  endDate: string,
  excludeId?: string
) {
  let query = supabase
    .from('leave_requests')
    .select('id, start_date, end_date, status')
    .eq('employee_id', employeeId)
    .in('status', ['pending', 'approved'])
    .lte('start_date', endDate)
    .gte('end_date', startDate)

  if (excludeId) query = query.neq('id', excludeId)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ============================================
// Leave Balances
// ============================================

export async function getMyLeaveBalances(employeeId: string, year: number) {
  const { data, error } = await supabase
    .from('leave_balances')
    .select('*, leave_type:leave_types(id, name, code, is_paid)')
    .eq('employee_id', employeeId)
    .eq('year', year)
  if (error) throw error
  return data
}

export async function getAllLeaveBalances(orgId: string, year: number) {
  const { data, error } = await supabase
    .from('leave_balances')
    .select('*, leave_type:leave_types(id, name, code, is_paid), employee:employees(id, first_name, last_name, email, department_id)')
    .eq('organization_id', orgId)
    .eq('year', year)
    .order('employee_id')
  if (error) throw error
  return data
}

export async function upsertLeaveBalance(balance: Partial<LeaveBalance>) {
  const { data, error } = await supabase
    .from('leave_balances')
    .upsert(balance, { onConflict: 'employee_id,leave_type_id,year' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function adjustLeaveBalance(
  id: string,
  adjustments: Partial<Pick<LeaveBalance, 'total_days' | 'used_days' | 'pending_days' | 'credited' | 'debited' | 'closing_balance'>>
) {
  const { data, error } = await supabase
    .from('leave_balances')
    .update(adjustments)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function initializeYearBalances(orgId: string, year: number) {
  // Get all active employees
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id')
    .eq('organization_id', orgId)
    .eq('status', 'active')
  if (empError) throw empError

  // Get all active leave types
  const { data: leaveTypes, error: ltError } = await supabase
    .from('leave_types')
    .select('id, default_days')
    .eq('organization_id', orgId)
    .eq('is_active', true)
  if (ltError) throw ltError

  if (!employees?.length || !leaveTypes?.length) return []

  // Build upsert records
  const records = employees.flatMap((emp) =>
    leaveTypes.map((lt) => ({
      employee_id: emp.id,
      leave_type_id: lt.id,
      organization_id: orgId,
      year,
      total_days: lt.default_days,
      used_days: 0,
      pending_days: 0,
      carried_forward_days: 0,
      opening_balance: lt.default_days,
      credited: lt.default_days,
      debited: 0,
      closing_balance: lt.default_days,
    }))
  )

  const { data, error } = await supabase
    .from('leave_balances')
    .upsert(records, { onConflict: 'employee_id,leave_type_id,year' })
    .select()
  if (error) throw error
  return data
}

// ============================================
// Holidays
// ============================================

export async function getHolidays(orgId: string, year?: number) {
  let query = supabase
    .from('holidays')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)

  if (year) {
    query = query
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
  }

  const { data, error } = await query.order('date')
  if (error) throw error
  return data
}

export async function createHoliday(holiday: Partial<Holiday>) {
  const { data, error } = await supabase
    .from('holidays')
    .insert(holiday)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateHoliday(id: string, updates: Partial<Holiday>) {
  const { data, error } = await supabase
    .from('holidays')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteHoliday(id: string) {
  const { error } = await supabase
    .from('holidays')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function getHolidayDates(orgId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('holidays')
    .select('date')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .gte('date', startDate)
    .lte('date', endDate)
  if (error) throw error
  return (data || []).map((h) => h.date)
}

// ============================================
// Leave Encashment
// ============================================

export async function getEncashmentRequests(orgId: string) {
  const { data, error } = await supabase
    .from('leave_encashment_requests')
    .select('*, leave_type:leave_types(id, name), employee:employees!leave_encashment_requests_employee_id_fkey(id, first_name, last_name, email)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createEncashmentRequest(request: Partial<LeaveEncashmentRequest>) {
  const { data, error } = await supabase
    .from('leave_encashment_requests')
    .insert(request)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEncashmentStatus(id: string, status: string, approvedBy?: string) {
  const updates: Record<string, unknown> = { status }
  if (approvedBy) {
    updates.approved_by = approvedBy
    updates.approved_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('leave_encashment_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ============================================
// Leave Blackout Periods
// ============================================

export async function getBlackoutPeriods(orgId: string) {
  const { data, error } = await supabase
    .from('leave_blackout_periods')
    .select('*')
    .eq('organization_id', orgId)
    .order('start_date')
  if (error) throw error
  return data as LeaveBlackoutPeriod[]
}

export async function createBlackoutPeriod(period: Partial<LeaveBlackoutPeriod>) {
  const { data, error } = await supabase
    .from('leave_blackout_periods')
    .insert(period)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBlackoutPeriod(id: string, updates: Partial<LeaveBlackoutPeriod>) {
  const { data, error } = await supabase
    .from('leave_blackout_periods')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBlackoutPeriod(id: string) {
  const { error } = await supabase
    .from('leave_blackout_periods')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ============================================
// Carry Forward
// ============================================

export async function getCarryForwardLogs(orgId: string, year?: number) {
  let query = supabase
    .from('leave_carry_forward_logs')
    .select('*, leave_type:leave_types(id, name), employee:employees(id, first_name, last_name)')
    .eq('organization_id', orgId)

  if (year) query = query.eq('to_year', year)

  const { data, error } = await query.order('processed_at', { ascending: false })
  if (error) throw error
  return data
}

export async function processCarryForward(orgId: string, fromYear: number, toYear: number) {
  // Get balances for fromYear with carry-forward-eligible leave types
  const { data: balances, error: balError } = await supabase
    .from('leave_balances')
    .select('*, leave_type:leave_types(id, name, is_carry_forward, max_carry_forward_days)')
    .eq('organization_id', orgId)
    .eq('year', fromYear)
  if (balError) throw balError

  const logs: Record<string, unknown>[] = []

  for (const bal of balances || []) {
    const lt = bal.leave_type as { is_carry_forward?: boolean; max_carry_forward_days?: number } | null
    if (!lt?.is_carry_forward) continue

    const available = bal.total_days + bal.carried_forward_days - bal.used_days - bal.pending_days
    if (available <= 0) continue

    const maxCarry = lt.max_carry_forward_days || 0
    const daysCarried = Math.min(available, maxCarry)
    const daysLapsed = available - daysCarried

    if (daysCarried > 0) {
      // Upsert the new year balance with carried forward days
      await upsertLeaveBalance({
        employee_id: bal.employee_id,
        leave_type_id: bal.leave_type_id,
        organization_id: orgId,
        year: toYear,
        carried_forward_days: daysCarried,
      })
    }

    logs.push({
      organization_id: orgId,
      employee_id: bal.employee_id,
      leave_type_id: bal.leave_type_id,
      from_year: fromYear,
      to_year: toYear,
      days_carried: daysCarried,
      days_lapsed: daysLapsed,
    })
  }

  if (logs.length > 0) {
    const { error } = await supabase
      .from('leave_carry_forward_logs')
      .insert(logs)
    if (error) throw error
  }

  return logs.length
}

// ============================================
// Current Employee Helper
// ============================================

export async function getCurrentEmployee(profileId: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('profile_id', profileId)
    .single()
  if (error) throw error
  return data
}
