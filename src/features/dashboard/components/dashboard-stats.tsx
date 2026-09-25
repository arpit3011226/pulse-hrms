import { Users, Building2, CalendarDays, Clock, Briefcase, ClipboardCheck, UserCheck } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import type { DashboardStats as DashboardStatsData } from '../api/dashboard.api'

interface DashboardStatsProps {
  stats: DashboardStatsData | undefined
  isLoading: boolean
  role?: string
}

export function DashboardStats({ stats, isLoading, role }: DashboardStatsProps) {
  const s = stats ?? {
    totalEmployees: 0,
    totalDepartments: 0,
    pendingLeaves: 0,
    presentToday: 0,
    openRequisitions: 0,
  }

  const isAdmin = role === 'super_admin' || role === 'hr_admin'
  const isLeadership = role === 'leadership'
  const isManager = role === 'manager'
  const isPayrollAdmin = role === 'payroll_admin'
  const isEmployee = role === 'employee'

  // Build cards based on role
  const cards: {
    title: string
    value: string | number
    icon: typeof Users
    color: 'purple' | 'blue' | 'amber' | 'emerald' | 'rose' | 'cyan' | 'orange' | 'indigo'
    description?: string
  }[] = []

  if (isAdmin || isLeadership) {
    cards.push(
      { title: 'Total Employees', value: isLoading ? '—' : s.totalEmployees, icon: Users, color: 'blue', description: 'Active employees' },
      { title: 'Departments', value: isLoading ? '—' : s.totalDepartments, icon: Building2, color: 'purple' },
    )
  }

  if (isAdmin || isLeadership || isManager) {
    cards.push(
      { title: 'Pending Leaves', value: isLoading ? '—' : s.pendingLeaves, icon: CalendarDays, color: 'amber', description: 'Awaiting approval' },
      {
        title: 'Present Today',
        value: isLoading ? '—' : s.presentToday,
        icon: UserCheck,
        color: 'emerald',
        description: `${s.totalEmployees > 0 ? Math.round((s.presentToday / s.totalEmployees) * 100) : 0}% attendance`,
      },
    )
  }

  if (isAdmin) {
    cards.push(
      { title: 'Open Requisitions', value: isLoading ? '—' : s.openRequisitions, icon: Briefcase, color: 'rose', description: 'Active job openings' },
    )
  }

  if (isPayrollAdmin) {
    cards.push(
      { title: 'Total Employees', value: isLoading ? '—' : s.totalEmployees, icon: Users, color: 'blue', description: 'Active employees' },
      { title: 'Pending Leaves', value: isLoading ? '—' : s.pendingLeaves, icon: ClipboardCheck, color: 'orange', description: 'Pending approvals' },
    )
  }

  if (isEmployee) {
    cards.push(
      {
        title: 'Present Today',
        value: isLoading ? '—' : s.presentToday,
        icon: Clock,
        color: 'emerald',
        description: `${s.totalEmployees > 0 ? Math.round((s.presentToday / s.totalEmployees) * 100) : 0}% attendance`,
      },
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <StatCard
          key={card.title}
          title={card.title}
          value={card.value}
          icon={card.icon}
          color={card.color}
          description={card.description}
        />
      ))}
    </div>
  )
}
