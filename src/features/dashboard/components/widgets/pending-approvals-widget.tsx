import { Link } from '@tanstack/react-router'
import { ClipboardCheck, CalendarDays, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePendingApprovalCounts } from '../../hooks/use-dashboard'

interface PendingApprovalsWidgetProps {
  employeeId: string | undefined
  role: string | undefined
}

export function PendingApprovalsWidget({ employeeId, role }: PendingApprovalsWidgetProps) {
  const { data: counts } = usePendingApprovalCounts(employeeId, role)

  const items = [
    {
      label: 'Leave Requests',
      count: counts?.leaveRequests ?? 0,
      icon: CalendarDays,
      href: '/leave',
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
    },
    {
      label: 'Regularizations',
      count: counts?.regularizations ?? 0,
      icon: Clock,
      href: '/attendance',
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
    },
  ].filter((i) => i.count > 0)

  const total = items.reduce((sum, i) => sum + i.count, 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardCheck className="h-5 w-5 text-orange-500" />
          Pending Approvals
          {total > 0 && (
            <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
              {total}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">All caught up!</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.color}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                </div>
                <span className="text-lg font-bold text-orange-500">{item.count}</span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
