import { Users, Building2, CalendarDays, Clock } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'

interface DashboardStatsProps {
  totalEmployees: number
  totalDepartments: number
  pendingLeaves: number
  presentToday: number
}

export function DashboardStats({ totalEmployees, totalDepartments, pendingLeaves, presentToday }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Employees"
        value={totalEmployees}
        icon={Users}
        change={{ value: 12, trend: 'up' }}
      />
      <StatCard
        title="Departments"
        value={totalDepartments}
        icon={Building2}
      />
      <StatCard
        title="Pending Leaves"
        value={pendingLeaves}
        icon={CalendarDays}
        description="Awaiting approval"
      />
      <StatCard
        title="Present Today"
        value={presentToday}
        icon={Clock}
        description={`${totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0}% attendance`}
      />
    </div>
  )
}
