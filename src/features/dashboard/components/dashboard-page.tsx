import { useAuth } from '@/features/auth/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { useWorkflowEvaluator } from '@/features/workflows/hooks/use-workflow-evaluator'
import {
  useDashboardStats,
  useRecentActivity,
  useDashboardEmployee,
} from '../hooks/use-dashboard'
import { DashboardStats } from './dashboard-stats'
import { RecentActivity } from './recent-activity'
import { QuickActions } from './quick-actions'
import { GreetingBanner } from './widgets/greeting-banner'
import { UpcomingHolidaysWidget } from './widgets/upcoming-holidays-widget'
import { LeaveBalanceWidget } from './widgets/leave-balance-widget'
import { TeamLeavesWidget } from './widgets/team-leaves-widget'
import { BirthdaysAnniversariesWidget } from './widgets/birthdays-widget'
import { PendingApprovalsWidget } from './widgets/pending-approvals-widget'
import { MyAttendanceWidget } from './widgets/my-attendance-widget'
import { AnnouncementsWidget } from './widgets/announcements-widget'
import { ThingsToDoWidget } from './widgets/things-to-do-widget'

export function DashboardPage() {
  const { profile } = useAuth()
  const permissions = usePermissions()
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: activities } = useRecentActivity()
  const { data: employee } = useDashboardEmployee()

  useWorkflowEvaluator()

  const role = profile?.role
  const employeeId = employee?.id

  // Role checks
  const isAdmin = role === 'super_admin' || role === 'hr_admin'
  const isManager = role === 'manager'
  const isLeadership = role === 'leadership'
  const isPayrollAdmin = role === 'payroll_admin'
  const showTeamWidgets = isAdmin || isManager || isLeadership
  const showPendingApprovals = isAdmin || isManager || isPayrollAdmin
  const canManageAnnouncements = isAdmin || isLeadership || isPayrollAdmin

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <GreetingBanner />

      {/* Stats Row */}
      <DashboardStats stats={stats} isLoading={statsLoading} role={role} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px] items-start">
        {/* Left Column */}
        <div className="space-y-6 min-w-0">
          <ThingsToDoWidget employeeId={employeeId} />
          <AnnouncementsWidget
            canManage={canManageAnnouncements}
            userRole={role}
            userDepartmentId={employee?.department_id}
          />
          {showPendingApprovals && (
            <PendingApprovalsWidget employeeId={employeeId} role={role} />
          )}
          <MyAttendanceWidget employeeId={employeeId} />
          {(isAdmin || isLeadership) && (
            <RecentActivity activities={activities ?? []} />
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6 min-w-0">
          <UpcomingHolidaysWidget />
          {showTeamWidgets && (
            <TeamLeavesWidget employeeId={employeeId} isOrgWide={isAdmin || isLeadership} />
          )}
          <LeaveBalanceWidget employeeId={employeeId} />
          <BirthdaysAnniversariesWidget />
          <QuickActions />
        </div>
      </div>
    </div>
  )
}
