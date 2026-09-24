import { supabase } from '@/lib/supabase'
import { one } from '@/lib/supabase-embed'
import type { AnnouncementWithCreator } from '@/types/database.types'

export interface DashboardStats {
  totalEmployees: number
  totalDepartments: number
  pendingLeaves: number
  presentToday: number
  openRequisitions: number
  activeCourses: number
}

export interface RecentActivityItem {
  id: string
  user: string
  action: string
  timestamp: string
}

export interface UpcomingPerson {
  id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  department_id: string | null
  department_name: string | null
  date: string // the birthday or joining date
  upcoming_date: string // the next occurrence this year
  days_away: number
  years?: number // years of service (for anniversaries)
}

export interface TeamLeaveItem {
  id: string
  employee_id: string
  employee_name: string
  avatar_url: string | null
  department_name: string | null
  leave_type_name: string
  start_date: string
  end_date: string
  is_half_day: boolean
  status: string
}

export interface AttendanceDayItem {
  date: string
  status: string | null // present, absent, half_day, on_leave, holiday, weekend
  clock_in: string | null
  clock_out: string | null
  work_hours: number | null
}

export interface PendingApprovalCounts {
  leaveRequests: number
  regularizations: number
}

// ============================================
// Existing Functions
// ============================================

export async function fetchDashboardStats(organizationId: string): Promise<DashboardStats> {
  const today = new Date().toISOString().split('T')[0]

  const [employees, departments, pendingLeaves, todayAttendance, openReqs, activeCourses] =
    await Promise.all([
      supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active'),
      supabase
        .from('departments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId),
      supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'pending'),
      supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('date', today)
        .eq('status', 'present'),
      supabase
        .from('job_requisitions')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'open'),
      supabase
        .from('training_courses')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'published'),
    ])

  return {
    totalEmployees: employees.count ?? 0,
    totalDepartments: departments.count ?? 0,
    pendingLeaves: pendingLeaves.count ?? 0,
    presentToday: todayAttendance.count ?? 0,
    openRequisitions: openReqs.count ?? 0,
    activeCourses: activeCourses.count ?? 0,
  }
}

export async function fetchRecentActivity(organizationId: string): Promise<RecentActivityItem[]> {
  const activities: RecentActivityItem[] = []

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: newHires } = await supabase
    .from('employees')
    .select('id, first_name, last_name, created_at')
    .eq('organization_id', organizationId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(5)

  if (newHires) {
    for (const emp of newHires) {
      activities.push({
        id: `hire-${emp.id}`,
        user: `${emp.first_name} ${emp.last_name}`,
        action: 'joined the organization',
        timestamp: emp.created_at,
      })
    }
  }

  const { data: recentLeaves } = await supabase
    .from('leave_requests')
    .select('id, status, created_at, employee:employees!leave_requests_employee_id_fkey(first_name, last_name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (recentLeaves) {
    for (const lr of recentLeaves) {
      const emp = one(lr.employee)
      if (emp) {
        const action = lr.status === 'pending'
          ? 'applied for leave'
          : lr.status === 'approved'
            ? 'had leave approved'
            : lr.status === 'rejected'
              ? 'had leave rejected'
              : 'updated leave request'
        activities.push({
          id: `leave-${lr.id}`,
          user: `${emp.first_name} ${emp.last_name}`,
          action,
          timestamp: lr.created_at,
        })
      }
    }
  }

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return activities.slice(0, 10)
}

// ============================================
// Upcoming Birthdays
// ============================================

export async function fetchUpcomingBirthdays(organizationId: string): Promise<UpcomingPerson[]> {
  const { data } = await supabase
    .from('employees')
    .select('id, first_name, last_name, avatar_url, birth_day, birth_month, department_id, department:departments!department_id(name)')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .not('birth_month', 'is', null)

  if (!data) return []

  const today = new Date()
  const results: UpcomingPerson[] = []

  for (const emp of data) {
    if (!emp.birth_month || !emp.birth_day) continue
    // Day and month only — the year is private, see migration 00045.
    const thisYear = new Date(today.getFullYear(), emp.birth_month - 1, emp.birth_day)
    // If already passed this year, look at next year
    if (thisYear < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      thisYear.setFullYear(today.getFullYear() + 1)
    }
    const diffMs = thisYear.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const daysAway = Math.round(diffMs / (1000 * 60 * 60 * 24))
    if (daysAway <= 30) {
      const dept = one(emp.department)
      results.push({
        id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        avatar_url: emp.avatar_url,
        department_id: emp.department_id,
        department_name: dept?.name ?? null,
        date: `${String(emp.birth_month).padStart(2, '0')}-${String(emp.birth_day).padStart(2, '0')}`,
        upcoming_date: thisYear.toISOString().split('T')[0],
        days_away: daysAway,
      })
    }
  }

  results.sort((a, b) => a.days_away - b.days_away)
  return results
}

// ============================================
// Upcoming Work Anniversaries
// ============================================

export async function fetchUpcomingAnniversaries(organizationId: string): Promise<UpcomingPerson[]> {
  const { data } = await supabase
    .from('employees')
    .select('id, first_name, last_name, avatar_url, date_of_joining, department_id, department:departments!department_id(name)')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .not('date_of_joining', 'is', null)

  if (!data) return []

  const today = new Date()
  const results: UpcomingPerson[] = []

  for (const emp of data) {
    if (!emp.date_of_joining) continue
    const doj = new Date(emp.date_of_joining)
    const thisYear = new Date(today.getFullYear(), doj.getMonth(), doj.getDate())
    if (thisYear < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      thisYear.setFullYear(today.getFullYear() + 1)
    }
    const diffMs = thisYear.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const daysAway = Math.round(diffMs / (1000 * 60 * 60 * 24))
    const years = thisYear.getFullYear() - doj.getFullYear()

    // Only show if completing at least 1 year and within 30 days
    if (daysAway <= 30 && years >= 1) {
      const dept = one(emp.department)
      results.push({
        id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        avatar_url: emp.avatar_url,
        department_id: emp.department_id,
        department_name: dept?.name ?? null,
        date: emp.date_of_joining,
        upcoming_date: thisYear.toISOString().split('T')[0],
        days_away: daysAway,
        years,
      })
    }
  }

  results.sort((a, b) => a.days_away - b.days_away)
  return results
}

// ============================================
// Team On Leave
// ============================================

async function fetchOnLeave(organizationId: string, employeeIds?: string[]): Promise<TeamLeaveItem[]> {
  const today = new Date().toISOString().split('T')[0]
  const weekEnd = new Date()
  weekEnd.setDate(weekEnd.getDate() + 7)
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  let query = supabase
    .from('leave_requests')
    .select(`
      id, employee_id, start_date, end_date, is_half_day, status,
      leave_type:leave_types(name),
      employee:employees!leave_requests_employee_id_fkey(first_name, last_name, avatar_url, department:departments!department_id(name))
    `)
    .eq('organization_id', organizationId)
    .in('status', ['approved', 'pending'])
    .lte('start_date', weekEndStr)
    .gte('end_date', today)
    .order('start_date', { ascending: true })
    .limit(20)

  if (employeeIds && employeeIds.length > 0) {
    query = query.in('employee_id', employeeIds)
  }

  const { data } = await query
  if (!data) return []

  return data.map((lr) => {
    const emp = one(lr.employee)
    const lt = one(lr.leave_type)
    return {
      id: lr.id,
      employee_id: lr.employee_id,
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
      avatar_url: emp?.avatar_url ?? null,
      department_name: one(emp?.department)?.name ?? null,
      leave_type_name: lt?.name ?? 'Leave',
      start_date: lr.start_date,
      end_date: lr.end_date,
      is_half_day: lr.is_half_day,
      status: lr.status,
    }
  })
}

export async function fetchTeamOnLeave(managerId: string, organizationId: string): Promise<TeamLeaveItem[]> {
  // Get direct reports
  const { data: reports } = await supabase
    .from('employees')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('reporting_manager_id', managerId)
    .eq('status', 'active')

  if (!reports || reports.length === 0) return []
  return fetchOnLeave(organizationId, reports.map((r) => r.id))
}

export async function fetchOrgOnLeave(organizationId: string): Promise<TeamLeaveItem[]> {
  return fetchOnLeave(organizationId)
}

// ============================================
// My Attendance Summary (current week)
// ============================================

export async function fetchMyAttendanceSummary(employeeId: string, organizationId: string): Promise<AttendanceDayItem[]> {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1))
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)

  const startDate = monday.toISOString().split('T')[0]
  const endDate = friday.toISOString().split('T')[0]

  const { data } = await supabase
    .from('attendance_records')
    .select('date, status, clock_in, clock_out, work_hours')
    .eq('employee_id', employeeId)
    .eq('organization_id', organizationId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  // Build full Mon-Fri array
  const days: AttendanceDayItem[] = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const record = data?.find((r) => r.date === dateStr)
    days.push({
      date: dateStr,
      status: record?.status ?? null,
      clock_in: record?.clock_in ?? null,
      clock_out: record?.clock_out ?? null,
      work_hours: record?.work_hours ?? null,
    })
  }

  return days
}

// ============================================
// Pending Approval Counts
// ============================================

export async function fetchPendingApprovalCounts(
  employeeId: string,
  organizationId: string,
  role: string
): Promise<PendingApprovalCounts> {
  const isAdmin = role === 'super_admin' || role === 'hr_admin'

  // For managers: count pending leave requests for direct reports
  // For admins: count all pending leave requests
  let leaveCount = 0
  if (isAdmin) {
    const { count } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
    leaveCount = count ?? 0
  } else {
    // Manager: get direct reports first
    const { data: reports } = await supabase
      .from('employees')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('reporting_manager_id', employeeId)
      .eq('status', 'active')

    if (reports && reports.length > 0) {
      const { count } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .in('employee_id', reports.map((r) => r.id))
      leaveCount = count ?? 0
    }
  }

  // Regularization requests
  let regCount = 0
  if (isAdmin) {
    const { count } = await supabase
      .from('attendance_regularization_requests')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
    regCount = count ?? 0
  }

  return {
    leaveRequests: leaveCount,
    regularizations: regCount,
  }
}

// ============================================
// Announcements
// ============================================

export async function fetchAnnouncements(organizationId: string): Promise<AnnouncementWithCreator[]> {
  const now = new Date().toISOString()

  const { data } = await supabase
    .from('announcements')
    .select(`
      *,
      creator:profiles!announcements_created_by_fkey(id, first_name, last_name, avatar_url)
    `)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(15)

  return (data ?? []) as AnnouncementWithCreator[]
}

export async function createAnnouncement(announcement: {
  organization_id: string
  title: string
  content: string
  priority: string
  audience_type: string
  audience_roles: string[]
  audience_department_ids: string[]
  is_pinned: boolean
  expires_at: string | null
  created_by: string
}) {
  const { data, error } = await supabase
    .from('announcements')
    .insert({ ...announcement, is_active: true })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) throw error
}

// ============================================
// Get current employee for dashboard
// ============================================

export async function getCurrentEmployee(profileId: string) {
  const { data } = await supabase
    .from('employees')
    .select('id, first_name, last_name, department_id, reporting_manager_id, date_of_joining, avatar_url, status, gender, designation_id, employment_type, personal:employee_personal(date_of_birth)')
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .single()

  return data
}
