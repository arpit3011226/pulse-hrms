import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { LeaveBalanceWithRelations } from '@/types/database.types'

interface LeaveBalanceCardsProps {
  balances: LeaveBalanceWithRelations[]
  isLoading?: boolean
}

export function LeaveBalanceCards({ balances, isLoading }: LeaveBalanceCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-2 w-full mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (balances.length === 0) return null

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {balances.map((balance) => {
        const total = balance.total_days + balance.carried_forward_days
        const used = balance.used_days
        const pending = balance.pending_days
        const available = Math.max(0, total - used - pending)
        const usedPercent = total > 0 ? Math.min(100, (used / total) * 100) : 0
        const pendingPercent = total > 0 ? Math.min(100 - usedPercent, (pending / total) * 100) : 0

        return (
          <Card key={balance.id}>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">
                {balance.leave_type?.name || 'Leave'}
                {balance.leave_type?.code && (
                  <span className="ml-1 text-xs">({balance.leave_type.code})</span>
                )}
              </p>
              <p className="mt-1 text-2xl font-semibold">{available}</p>
              <p className="text-xs text-muted-foreground mb-2">days available</p>

              {/* Progress bar */}
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full flex">
                  <div
                    className="bg-emerald-500 transition-all"
                    style={{ width: `${usedPercent}%` }}
                  />
                  <div
                    className="bg-amber-400 transition-all"
                    style={{ width: `${pendingPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>Used: {used}</span>
                {pending > 0 && <span>Pending: {pending}</span>}
                <span>Total: {total}</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
