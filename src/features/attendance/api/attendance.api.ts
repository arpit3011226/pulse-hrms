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

export async function getTeamAttendance(managerId: string | string[], orgId: string, date?: string) {
  const { data: reports, error: reportsError } = await supabase
    .from('employees')
    .select('id')
    .eq('organization_id', orgId)
    .in('reporting_manager_id', Array.isArray(managerId) ? managerId : [managerId])
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

/**
 * F33 — ask the browser where we are, without blocking the punch.
 *
 * Location is a nice-to-have on a clock-in, not a gate: if the person declines
 * or the device cannot fix a position, they still get to record their time.
 */
async function tryGetPosition(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 5000)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer)
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        clearTimeout(timer)
        resolve(null)
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    )
  })
}

/** Metres between two points, for the geofence check. */
function distanceMetres(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
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

  const pos = await tryGetPosition()
  if (pos) {
    Object.assign(record, {
      clock_in_latitude: pos.lat,
      clock_in_longitude: pos.lng,
      clock_in_source: 'web',
    })
    // Flag whether the punch was inside any active office geofence
    const { data: locations } = await supabase
      .from('work_locations')
      .select('latitude, longitude, geofence_radius_metres')
      .eq('organization_id', orgId)
      .eq('is_active', true)
    const inside = (locations ?? []).some((l) => {
      if (l.latitude == null || l.longitude == null) return false
      return (
        distanceMetres(pos, { lat: Number(l.latitude), lng: Number(l.longitude) }) <=
        (l.geofence_radius_metres ?? 200)
      )
    })
    if ((locations ?? []).length > 0) {
      Object.assign(record, { is_within_geofence: inside })
    }
  }

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

export async function getTeamRegularizations(managerId: string | string[], orgId: string) {
  const { data: reports, error: reportsError } = await supabase
    .from('employees')
    .select('id')
    .eq('organization_id', orgId)
    .in('reporting_manager_id', Array.isArray(managerId) ? managerId : [managerId])
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
