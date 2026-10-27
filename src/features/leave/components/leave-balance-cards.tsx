import { AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { LeaveBalanceWithRelations } from '@/types/database.types'
import { readBalance, HEALTH_BAR, HEALTH_LABEL } from '../utils/balance-health'

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
              <Skeleton className="mb-3 h-4 w-24" />
              <Skeleton className="mb-2 h-8 w-16" />
              <Skeleton className="mb-2 h-2 w-full" />
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
        const { available, availablePercent, pendingPercent, health } = readBalance({
          total,
          used,
          pending,
        })

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
              <p className="mb-2 text-xs text-muted-foreground">days available</p>

              {/*
                The bar is what is LEFT, so it matches the number above it and
                shrinks as the balance does. Every leave type gets one, even
                at full balance — an empty track next to a full one reads as a
                broken control rather than as "nothing used yet".

                Pending sits beside it in a lighter shade: those days are not
                spent, but they are not yours to plan with either.
              */}
              <div
                className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={Math.round(availablePercent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${balance.leave_type?.name || 'Leave'}: ${available} of ${total} days available`}
              >
                <div
                  className={`h-full transition-all ${HEALTH_BAR[health]}`}
                  style={{ width: `${availablePercent}%` }}
                />
                {pendingPercent > 0 && (
                  <div
                    className="h-full bg-amber-300/70 transition-all"
                    style={{ width: `${pendingPercent}%` }}
                    title={`${pending} day${pending === 1 ? '' : 's'} awaiting approval`}
                  />
                )}
              </div>

              <div className="mt-2 flex flex-wrap justify-between gap-x-2 text-xs text-muted-foreground">
                <span>Used: {used}</span>
                {pending > 0 && <span>Pending: {pending}</span>}
                <span>Total: {total}</span>
              </div>

              {/*
                Said in words as well as colour. Roughly one man in twelve
                cannot reliably tell the red from the green, and a balance
                running out is worth more than a hue.
              */}
              {HEALTH_LABEL[health] && (
                <p
                  className={`mt-1.5 flex items-center gap-1 text-xs ${
                    health === 'low'
                      ? 'text-rose-600'
                      : health === 'warning'
                      ? 'text-amber-600'
                      : 'text-muted-foreground'
                  }`}
                >
                  {health !== 'none' && <AlertTriangle className="h-3 w-3" />}
                  {HEALTH_LABEL[health]}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
