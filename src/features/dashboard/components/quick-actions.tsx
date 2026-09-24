import { Link } from '@tanstack/react-router'
import { UserPlus, CalendarPlus, ClipboardList, Building2, FileText, BarChart3, Target, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePermissions } from '@/hooks/use-permissions'

const ACTION_COLORS: Record<string, { bg: string; text: string; hover: string }> = {
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-600 dark:text-blue-400',    hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-600 dark:text-amber-400',   hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/30' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30' },
  purple:  { bg: 'bg-purple-50 dark:bg-purple-900/20',  text: 'text-purple-600 dark:text-purple-400',  hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/30' },
  rose:    { bg: 'bg-rose-50 dark:bg-rose-900/20',    text: 'text-rose-600 dark:text-rose-400',    hover: 'hover:bg-rose-100 dark:hover:bg-rose-900/30' },
  indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-900/20',  text: 'text-indigo-600 dark:text-indigo-400',  hover: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/30' },
  cyan:    { bg: 'bg-cyan-50 dark:bg-cyan-900/20',    text: 'text-cyan-600 dark:text-cyan-400',    hover: 'hover:bg-cyan-100 dark:hover:bg-cyan-900/30' },
  orange:  { bg: 'bg-orange-50 dark:bg-orange-900/20',  text: 'text-orange-600 dark:text-orange-400',  hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/30' },
}

export function QuickActions() {
  const permissions = usePermissions()

  const actions = [
    {
      title: 'Add Employee',
      icon: UserPlus,
      href: '/employees/new',
      visible: permissions.canManageEmployees,
      color: 'blue' as const,
    },
    {
      title: 'Apply Leave',
      icon: CalendarPlus,
      href: '/leave/apply',
      visible: true,
      color: 'amber' as const,
    },
    {
      title: 'Mark Attendance',
      icon: ClipboardList,
      href: '/attendance',
      visible: true,
      color: 'emerald' as const,
    },
    {
      title: 'Approve Leaves',
      icon: CalendarPlus,
      href: '/leave',
      visible: permissions.canApproveLeave,
      color: 'orange' as const,
    },
    {
      title: 'View Payslips',
      icon: FileText,
      href: '/payroll',
      visible: true,
      color: 'indigo' as const,
    },
    {
      title: 'Run Payroll',
      icon: DollarSign,
      href: '/payroll',
      visible: permissions.canManagePayroll,
      color: 'rose' as const,
    },
    {
      title: 'View Reports',
      icon: BarChart3,
      href: '/reports',
      visible: permissions.canViewReports,
      color: 'cyan' as const,
    },
    {
      title: 'My Goals',
      icon: Target,
      href: '/performance',
      visible: permissions.canViewPerformance,
      color: 'purple' as const,
    },
    {
      title: 'Add Department',
      icon: Building2,
      href: '/departments',
      visible: permissions.canManageDepartments,
      color: 'purple' as const,
    },
  ].filter((action) => action.visible).slice(0, 6) // Max 6 actions

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {actions.map((action) => {
            const palette = ACTION_COLORS[action.color] ?? ACTION_COLORS.blue
            return (
              <Link
                key={action.title}
                to={action.href}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors ${palette.hover}`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${palette.bg}`}>
                  <action.icon className={`h-5 w-5 ${palette.text}`} />
                </div>
                <span className="text-xs font-medium">{action.title}</span>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
