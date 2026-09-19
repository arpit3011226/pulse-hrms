import { supabase } from '@/lib/supabase'
import type {
  AttendanceRecord,
  Shift,
  ShiftRoster,
  AttendanceRegularizationRequest,
} from '@/types/database.types'

// ============================================
// Attendance Records
// ============================================

export interface AttendanceFilters {
  status?: string
  department_id?: string
  employee_id?: string
  date?: string
  start_date?: string
  end_date?: string
}

export async function getMyAttendance(employeeId: string, startDate?: string, endDate?: string) {
  let query = supabase
    .from('attendance_records')
    .select('*, shift:shifts(id, name, start_time, end_time)')
    .eq('employee_id', employeeId)

  if (startDate) query = query.gte('date', startDate)
  if (endDate) query = query.lte('date', endDate)

  const { data, error } = await query.order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function getTeamAttendance(managerId: string, orgId: string, date?: string) {
  const { data: reports, error: reportsError } = await supabase
    .from('employees')
    .select('id')
    .eq('organization_id', orgId)
    .eq('reporting_manager_id', managerId)
  if (reportsError) throw reportsError

  const reportIds = (reports || []).map((r) => r.id)
  if (reportIds.length === 0) return []

  let query = supabase
    .from('attendance_records')
    .select('*, employee:employees(id, first_name, last_name, email, avatar_url, department_id, department:departments!department_id(id, name)), shift:shifts(id, name, start_time, end_time)')
    .in('employee_id', reportIds)
    .eq('organization_id', orgId)

  if (date) query = query.eq('date', date)

  const { data, error } = await query.order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function getAllAttendance(orgId: string, filters?: AttendanceFilters) {
  let query = supabase
    .from('attendance_records')
    .select('*, employee:employees(id, first_name, last_name, email, avatar_url, department_id, department:departments!department_id(id, name)), shift:shifts(id, name, start_time, end_time)')
    .eq('organization_id', orgId)

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.employee_id) query = query.eq('employee_id', filters.employee_id)
  if (filters?.date) query = query.eq('date', filters.date)
  if (filters?.start_date) query = query.gte('date', filters.start_date)
  if (filters?.end_date) query = query.lte('date', filters.end_date)

  const { data, error } = await query.order('date', { ascending: false }).limit(500)
  if (error) throw error

  if (filters?.department_id && data) {
    return data.filter((r: Record<string, unknown>) => {
      const emp = r.employee as { department_id?: string } | null
      return emp?.department_id === filters.department_id
    })
  }

  return data
}

export async function getTodayAttendance(employeeId: string, today: string) {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*, shift:shifts(id, name, start_time, end_time)')
    .eq('employee_id', employeeId)
    .eq('date', today)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function clockIn(employeeId: string, orgId: string, today: string, shiftId?: string) {
  const record: Partial<AttendanceRecord> = {
    employee_id: employeeId,
    organization_id: orgId,
    date: today,
    clock_in: new Date().toISOString(),
    status: 'present',
  }
  if (shiftId) record.shift_id = shiftId

  const { data, error } = await supabase
    .from('attendance_records')
    .upsert(record, { onConflict: 'employee_id,date' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function clockOut(id: string, workHours: number) {
  const { data, error } = await supabase
    .from('attendance_records')
    .update({
      clock_out: new Date().toISOString(),
      work_hours: workHours,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markAttendance(record: Partial<AttendanceRecord>) {
  const { data, error } = await supabase
    .from('attendance_records')
    .upsert(record, { onConflict: 'employee_id,date' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>) {
  const { data, error } = await supabase
    .from('attendance_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ============================================
// Shifts
// ============================================

export async function getShifts(orgId: string) {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data
}

export async function createShift(shift: Partial<Shift>) {
  const { data, error } = await supabase
    .from('shifts')
    .insert(shift)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateShift(id: string, updates: Partial<Shift>) {
  const { data, error } = await supabase
    .from('shifts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteShift(id: string) {
  const { error } = await supabase
    .from('shifts')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw error
}

// ============================================
// Shift Rosters
// ============================================

export async function getShiftRosters(orgId: string) {
  const { data, error } = await supabase
    .from('shift_rosters')
    .select('*, employee:employees!shift_rosters_employee_id_fkey(id, first_name, last_name, email), shift:shifts(id, name, start_time, end_time)')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('start_date', { ascending: false })
  if (error) throw error
  return data
}

export async function assignShiftRoster(roster: Partial<ShiftRoster>) {
  const { data, error } = await supabase
    .from('shift_rosters')
    .insert(roster)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function bulkAssignShiftRoster(rosters: Partial<ShiftRoster>[]) {
  const { data, error } = await supabase
    .from('shift_rosters')
    .insert(rosters)
    .select()
  if (error) throw error
  return data
}

export async function updateShiftRoster(id: string, updates: Partial<ShiftRoster>) {
  const { data, error } = await supabase
    .from('shift_rosters')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteShiftRoster(id: string) {
  const { error } = await supabase
    .from('shift_rosters')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw error
}

export async function getEmployeeShift(employeeId: string, date: string) {
  const { data, error } = await supabase
    .from('shift_rosters')
    .select('*, shift:shifts(*)')
    .eq('employee_id', employeeId)
    .eq('is_active', true)
    .lte('start_date', date)
    .or(`end_date.is.null,end_date.gte.${date}`)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

// ============================================
// Regularization Requests
// ============================================

export async function getMyRegularizations(employeeId: string) {
  const { data, error } = await supabase
    .from('attendance_regularization_requests')
    .select('*, reviewer:employees!attendance_regularization_requests_reviewed_by_fkey(id, first_name, last_name)')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getTeamRegularizations(managerId: string, orgId: string) {
  const { data: reports, error: reportsError } = await supabase
    .from('employees')
    .select('id')
    .eq('organization_id', orgId)
    .eq('reporting_manager_id', managerId)
  if (reportsError) throw reportsError

  const reportIds = (reports || []).map((r) => r.id)
  if (reportIds.length === 0) return []

  const { data, error } = await supabase
    .from('attendance_regularization_requests')
    .select('*, employee:employees!attendance_regularization_requests_employee_id_fkey(id, first_name, last_name, email, avatar_url)')
    .in('employee_id', reportIds)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getAllRegularizations(orgId: string) {
  const { data, error } = await supabase
    .from('attendance_regularization_requests')
    .select('*, employee:employees!attendance_regularization_requests_employee_id_fkey(id, first_name, last_name, email, avatar_url), reviewer:employees!attendance_regularization_requests_reviewed_by_fkey(id, first_name, last_name)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createRegularization(request: Partial<AttendanceRegularizationRequest>) {
  const { data, error } = await supabase
    .from('attendance_regularization_requests')
    .insert(request)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function approveRegularization(
  id: string,
  reviewerId: string,
  remarks?: string
) {
  // Update the request status
  const { data: request, error: reqError } = await supabase
    .from('attendance_regularization_requests')
    .update({
      status: 'approved',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_remarks: remarks || null,
    })
    .eq('id', id)
    .select()
    .single()
  if (reqError) throw reqError

  // Apply the requested changes to the attendance record
  if (request.attendance_record_id) {
    const updates: Partial<AttendanceRecord> = { is_regularized: true }
    if (request.requested_clock_in) updates.clock_in = request.requested_clock_in
    if (request.requested_clock_out) updates.clock_out = request.requested_clock_out
    if (request.requested_status) updates.status = request.requested_status

    // Recalculate work hours if both times are present
    const finalClockIn = request.requested_clock_in || request.original_clock_in
    const finalClockOut = request.requested_clock_out || request.original_clock_out
    if (finalClockIn && finalClockOut) {
      const diffMs = new Date(finalClockOut).getTime() - new Date(finalClockIn).getTime()
      updates.work_hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100
    }

    await supabase
      .from('attendance_records')
      .update(updates)
      .eq('id', request.attendance_record_id)
  }

  return request
}

export async function rejectRegularization(
  id: string,
  reviewerId: string,
  remarks: string
) {
  const { data, error } = await supabase
    .from('attendance_regularization_requests')
    .update({
      status: 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_remarks: remarks,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ============================================
// Current Employee Helper
// ============================================

export async function getCurrentEmployee(profileId: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()
  if (error) throw error
  return data
}
