import { useState } from 'react'
import { Plus, Pencil, Trash2, ClipboardCheck, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCurrentEmployee,
  useMyGoals,
  useActiveCycle,
  usePerformanceCycles,
  useDeleteEmployeeGoal,
} from '../hooks/use-performance'
import { calculateGoalProgress, calculateOverallGoalProgress } from '../utils/performance-utils'
import { GOAL_CATEGORIES } from '@/lib/constants'
import { GoalFormDialog } from './goal-form-dialog'
import { GoalCheckinDialog } from './goal-checkin-dialog'
import type { EmployeeGoal, GoalKeyResult } from '@/types/database.types'
import { toast } from 'sonner'

type GoalWithKeyResults = EmployeeGoal & { goal_key_results?: GoalKeyResult[] }

export function MyGoalsTab() {
  const { data: employee } = useCurrentEmployee()
  const { data: activeCycle } = useActiveCycle()
  const { data: cycles } = usePerformanceCycles()
  const [selectedCycleId, setSelectedCycleId] = useState<string | undefined>(undefined)

  const cycleId = selectedCycleId || activeCycle?.id
  const { data: goals, isLoading } = useMyGoals(employee?.id || '', cycleId)
  const deleteGoal = useDeleteEmployeeGoal()

  const [formOpen, setFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalWithKeyResults | undefined>(undefined)
  const [checkinGoal, setCheckinGoal] = useState<EmployeeGoal | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EmployeeGoal | null>(null)

  const goalsList = (goals || []) as GoalWithKeyResults[]
  const overallProgress = calculateOverallGoalProgress(goalsList)

  const getCategoryLabel = (value: string) =>
    GOAL_CATEGORIES.find((c) => c.value === value)?.label || value

  const handleEdit = (goal: GoalWithKeyResults) => {
    setEditingGoal(goal)
    setFormOpen(true)
  }

  const handleAdd = () => {
    setEditingGoal(undefined)
    setFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteGoal.mutateAsync(deleteTarget.id)
      toast.success('Goal deleted')
    } catch {
      toast.error('Failed to delete goal')
    }
    setDeleteTarget(null)
  }

  if (!activeCycle && !selectedCycleId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Target className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No Active Performance Cycle</h3>
        <p className="text-sm text-muted-foreground mt-1">
          There is no active performance cycle at the moment. Please check back later or contact your HR administrator.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <Select
          value={cycleId || ''}
          onValueChange={(v) => setSelectedCycleId(v)}
        >
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Select cycle" />
          </SelectTrigger>
          <SelectContent>
            {(cycles || []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.cycle_name}
                {activeCycle?.id === c.id ? ' (Active)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Goal
        </Button>
      </div>

      {/* Overall Progress */}
      {goalsList.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Goal Progress</span>
              <span className="text-sm font-semibold">{overallProgress}%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goal Cards */}
      {goalsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Target className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-base font-medium">No Goals Yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Click "Add Goal" to set your first goal for this cycle.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {goalsList.map((goal) => {
            const progress = calculateGoalProgress(goal)
            return (
              <Card key={goal.id}>
                <CardContent className="p-4 space-y-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-medium">{goal.goal_title}</h4>
                      {goal.goal_description && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {goal.goal_description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCheckinGoal(goal)}>
                        <ClipboardCheck className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(goal)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(goal)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Badges row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{getCategoryLabel(goal.category)}</Badge>
                    <StatusBadge status={goal.status} />
                    <span className="text-xs text-muted-foreground">
                      Weight: {goal.weightage}%
                    </span>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Progress</span>
                      <span className="text-xs font-medium">{progress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Key Results */}
                  {goal.goal_key_results && goal.goal_key_results.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <span className="text-xs font-medium text-muted-foreground">Key Results</span>
                      {goal.goal_key_results.map((kr) => {
                        const krProgress = kr.target_value > 0
                          ? Math.min(100, Math.round((kr.current_value / kr.target_value) * 100))
                          : 0
                        return (
                          <div key={kr.id} className="flex items-center gap-3">
                            <span className="text-sm flex-1 truncate">{kr.kr_title}</span>
                            <span className="text-xs text-muted-foreground w-12 text-right">
                              {krProgress}%
                            </span>
                            <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all"
                                style={{ width: `${krProgress}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialogs */}
      {cycleId && employee?.id && (
        <GoalFormDialog
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open)
            if (!open) setEditingGoal(undefined)
          }}
          goal={editingGoal}
          employeeId={employee.id}
          cycleId={cycleId}
        />
      )}

      {checkinGoal && (
        <GoalCheckinDialog
          open={!!checkinGoal}
          onOpenChange={(open) => {
            if (!open) setCheckinGoal(null)
          }}
          goal={checkinGoal}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Goal"
        description="Are you sure you want to delete this goal? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteGoal.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
