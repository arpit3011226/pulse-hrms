import { Link } from '@tanstack/react-router'
import { UserPlus, CalendarPlus, ClipboardList, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePermissions } from '@/hooks/use-permissions'

export function QuickActions() {
  const permissions = usePermissions()

  const actions = [
    {
      title: 'Add Employee',
      icon: UserPlus,
      href: '/employees/new',
      visible: permissions.canManageEmployees,
    },
    {
      title: 'Apply Leave',
      icon: CalendarPlus,
      href: '/leave/apply',
      visible: true,
    },
    {
      title: 'Mark Attendance',
      icon: ClipboardList,
      href: '/attendance',
      visible: true,
    },
    {
      title: 'Add Department',
      icon: Building2,
      href: '/departments',
      visible: permissions.canManageDepartments,
    },
  ].filter((action) => action.visible)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              to={action.href}
              className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-secondary"
            >
              <action.icon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{action.title}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
