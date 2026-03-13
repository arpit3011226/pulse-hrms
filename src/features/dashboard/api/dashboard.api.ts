import { supabase } from '@/lib/supabase'

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

  // Recent new hires (last 30 days)
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

  // Recent leave requests
  const { data: recentLeaves } = await supabase
    .from('leave_requests')
    .select('id, status, created_at, employee:employees(first_name, last_name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (recentLeaves) {
    for (const lr of recentLeaves) {
      const emp = lr.employee as any
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

  // Sort by timestamp descending and take top 10
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return activities.slice(0, 10)
}
