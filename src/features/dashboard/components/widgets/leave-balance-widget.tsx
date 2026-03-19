import { CalendarDays } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useMyLeaveBalances } from '@/features/leave/hooks/use-leave'

interface LeaveBalanceWidgetProps {
  employeeId: string | undefined
}

export function LeaveBalanceWidget({ employeeId }: LeaveBalanceWidgetProps) {
  const currentYear = new Date().getFullYear()
  const { data: balances } = useMyLeaveBalances(employeeId ?? '', currentYear)

  const items = (balances ?? []).filter((b) => {
    const lt = b.leave_type as any
    return lt // only show if leave type info is available
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="h-5 w-5 text-indigo-500" />
          My Leave Balance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!employeeId ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No leave balances found</p>
        ) : (
          <div className="overflow-y-auto max-h-[200px]">
            <div className="space-y-3">
              {items.map((b) => {
                const lt = b.leave_type as any
                const total = (b.total_days ?? 0) + (b.carried_forward_days ?? 0)
                const used = b.used_days ?? 0
                const available = Math.max(0, total - used - (b.pending_days ?? 0))
                const pct = total > 0 ? Math.round((used / total) * 100) : 0
                return (
                  <div key={b.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{lt?.name ?? 'Leave'}</span>
                      <span className="text-muted-foreground">
                        {available} / {total} days
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
