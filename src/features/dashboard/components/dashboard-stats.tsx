import { Users, Building2, CalendarDays, Clock, Briefcase, GraduationCap } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import type { DashboardStats as DashboardStatsData } from '../api/dashboard.api'

interface DashboardStatsProps {
  stats: DashboardStatsData | undefined
  isLoading: boolean
}

export function DashboardStats({ stats, isLoading }: DashboardStatsProps) {
  const s = stats ?? {
    totalEmployees: 0,
    totalDepartments: 0,
    pendingLeaves: 0,
    presentToday: 0,
    openRequisitions: 0,
    activeCourses: 0,
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Total Employees"
        value={isLoading ? '—' : s.totalEmployees}
        icon={Users}
        description="Active employees"
      />
      <StatCard
        title="Departments"
        value={isLoading ? '—' : s.totalDepartments}
        icon={Building2}
      />
      <StatCard
        title="Pending Leaves"
        value={isLoading ? '—' : s.pendingLeaves}
        icon={CalendarDays}
        description="Awaiting approval"
      />
      <StatCard
        title="Present Today"
        value={isLoading ? '—' : s.presentToday}
        icon={Clock}
        description={`${s.totalEmployees > 0 ? Math.round((s.presentToday / s.totalEmployees) * 100) : 0}% attendance`}
      />
      <StatCard
        title="Open Requisitions"
        value={isLoading ? '—' : s.openRequisitions}
        icon={Briefcase}
        description="Active job openings"
      />
      <StatCard
        title="Active Courses"
        value={isLoading ? '—' : s.activeCourses}
        icon={GraduationCap}
        description="Published training courses"
      />
    </div>
  )
}
