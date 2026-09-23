import { GitBranch, Loader2, Target } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StatusBadge } from '@/components/shared/status-badge'
import { useGoalHierarchy } from '../hooks/use-performance'
import type { EmployeeGoalWithRelations } from '@/types/database.types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: EmployeeGoalWithRelations | null
}

function percent(current: number | null, target: number | null): number | null {
  if (target == null || target === 0) return null
  const p = ((current ?? 0) / target) * 100
  return Math.max(0, Math.min(100, Math.round(p)))
}

export function GoalHierarchyDialog({ open, onOpenChange, goal }: Props) {
  const { data: children, isLoading } = useGoalHierarchy(open && goal ? goal.id : '')
  const rows = (children ?? []) as EmployeeGoalWithRelations[]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" /> Cascaded goals
          </DialogTitle>
          <DialogDescription>
            Goals cascaded from <span className="font-medium">{goal?.goal_title}</span>.
          </DialogDescription>
        </DialogHeader>

        {/* Parent summary */}
        {goal && (
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{goal.goal_title}</p>
                <p className="text-xs text-muted-foreground">
                  {goal.employee
                    ? `${goal.employee.first_name} ${goal.employee.last_name}`
                    : 'Organisation goal'}
                  {goal.weightage != null ? ` · weight ${goal.weightage}%` : ''}
                </p>
              </div>
              <StatusBadge status={goal.status} />
            </div>
          </div>
        )}

        <ScrollArea className="max-h-96">
          {isLoading ? (
            <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 rounded-full bg-muted p-3">
                <Target className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Nothing cascaded yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use Cascade Goal to push this down to the team.
              </p>
            </div>
          ) : (
            <div className="space-y-2 pr-3">
              {rows.map((child) => {
                const pct = percent(child.current_value, child.target_value)
                return (
                  <div key={child.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{child.goal_title}</p>
                        <p className="text-xs text-muted-foreground">
                          {child.employee
                            ? `${child.employee.first_name} ${child.employee.last_name}`
                            : '—'}
                          {child.employee?.employee_code ? ` · ${child.employee.employee_code}` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {child.weightage != null && (
                          <Badge variant="outline" className="text-xs">{child.weightage}%</Badge>
                        )}
                        <StatusBadge status={child.status} />
                      </div>
                    </div>
                    {pct != null && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="w-10 text-right text-xs text-muted-foreground">{pct}%</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
