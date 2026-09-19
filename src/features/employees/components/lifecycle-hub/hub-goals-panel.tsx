import { Target } from 'lucide-react'
import { useActiveCycle, useMyGoals } from '@/features/performance/hooks/use-performance'
import { StatusBadge } from '@/components/shared/status-badge'

interface HubGoalsPanelProps {
  employeeId: string
}

export function HubGoalsPanel({ employeeId }: HubGoalsPanelProps) {
  const { data: cycle } = useActiveCycle()
  const { data: goals, isLoading } = useMyGoals(employeeId, cycle?.id)

  if (isLoading) {
    return <div className="animate-pulse rounded-lg border bg-muted/30 p-6 h-20" />
  }

  const goalsList = goals ?? []

  if (goalsList.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
        <Target className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
        No goals set{cycle ? ` for ${cycle.name}` : ''}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {goalsList.map((goal) => {
        const g = goal as typeof goal & {
          title?: string
          description?: string
          status?: string
          progress?: number
          weight?: number
        }
        const progress = g.progress ?? 0

        return (
          <div key={g.id} className="rounded-lg border bg-white p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{g.title || 'Untitled Goal'}</p>
                {g.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{g.description}</p>
                )}
              </div>
              <StatusBadge status={g.status || 'not_started'} />
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-foreground">{progress}%</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-rose-400 transition-all"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>

            {g.weight && (
              <p className="mt-2 text-[10px] text-muted-foreground">Weight: {g.weight}%</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
