import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  useCurrentEmployee,
  useActiveCycle,
  usePerformanceCycles,
  useTeamGoals,
} from '../hooks/use-performance'
import { calculateGoalProgress } from '../utils/performance-utils'
import { GOAL_CATEGORIES } from '@/lib/constants'
import { GoalFormDialog } from './goal-form-dialog'
import { CascadeGoalDialog } from './cascade-goal-dialog'
import type { EmployeeGoal, GoalKeyResult } from '@/types/database.types'

type GoalWithRelations = EmployeeGoal & {
  employee?: { id: string; first_name: string; last_name: string; employee_code: string }
  goal_key_results?: GoalKeyResult[]
}

const getCategoryLabel = (value: string) =>
  GOAL_CATEGORIES.find((c) => c.value === value)?.label || value

export function TeamGoalsTab() {
  const { data: employee } = useCurrentEmployee()
  const { data: activeCycle } = useActiveCycle()
  const { data: cycles } = usePerformanceCycles()
  const [selectedCycleId, setSelectedCycleId] = useState<string | undefined>(undefined)

  const cycleId = selectedCycleId || activeCycle?.id
  const { data: goals, isLoading } = useTeamGoals(employee?.id || '', cycleId)

  const [formOpen, setFormOpen] = useState(false)
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [cascadeOpen, setCascadeOpen] = useState(false)

  const goalsList = (goals || []) as GoalWithRelations[]

  const handleAssignGoal = (empId: string) => {
    setAssigneeId(empId)
    setFormOpen(true)
  }

  const columns: ColumnDef<GoalWithRelations>[] = [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const emp = row.original.employee
        if (!emp) return '-'
        return (
          <div>
            <span className="font-medium">{emp.first_name} {emp.last_name}</span>
            <span className="block text-xs text-muted-foreground">{emp.employee_code}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'goal_title',
      header: 'Goal',
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.original.goal_title}</span>
          {row.original.parent_goal_id && (
            <span className="block text-[11px] text-orange-600 flex items-center gap-1 mt-0.5">
              <GitBranch className="h-3 w-3" /> Cascaded
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      cell: ({ row }) => getCategoryLabel(row.original.category),
    },
    {
      accessorKey: 'weightage',
      header: 'Weight',
      cell: ({ row }) => `${row.original.weightage}%`,
    },
    {
      id: 'progress',
      header: 'Progress',
      cell: ({ row }) => {
        const progress = calculateGoalProgress(row.original)
        return (
          <div className="flex items-center gap-2 min-w-[120px]">
            <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-medium w-9 text-right">{progress}%</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ]

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={goalsList}
        searchKey="goal_title"
        searchPlaceholder="Search team goals..."
        isLoading={isLoading}
        toolbarActions={
          <div className="flex items-center gap-2">
            <Select
              value={cycleId || ''}
              onValueChange={(v) => setSelectedCycleId(v)}
            >
              <SelectTrigger className="w-60">
                <SelectValue placeholder="Filter by cycle" />
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
            <Button variant="outline" onClick={() => setCascadeOpen(true)}>
              <GitBranch className="mr-2 h-4 w-4" />
              Cascade Goal
            </Button>
            <Button onClick={() => handleAssignGoal('')}>
              <Plus className="mr-2 h-4 w-4" />
              Assign Goal
            </Button>
          </div>
        }
      />

      {cycleId && (
        <GoalFormDialog
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open)
            if (!open) setAssigneeId('')
          }}
          employeeId={assigneeId || employee?.id || ''}
          cycleId={cycleId}
        />
      )}

      {cycleId && (
        <CascadeGoalDialog
          open={cascadeOpen}
          onOpenChange={setCascadeOpen}
          cycleId={cycleId}
        />
      )}
    </div>
  )
}
