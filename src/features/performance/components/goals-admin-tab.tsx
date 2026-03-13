import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  useEmployeeGoals,
  useActiveCycle,
  usePerformanceCycles,
} from '../hooks/use-performance'
import { calculateGoalProgress } from '../utils/performance-utils'
import { GOAL_CATEGORIES } from '@/lib/constants'
import type { EmployeeGoal, GoalKeyResult } from '@/types/database.types'

type GoalWithRelations = EmployeeGoal & {
  employee?: { id: string; first_name: string; last_name: string; email: string; employee_code: string }
  performance_cycle?: { id: string; cycle_name: string; cycle_code: string }
  goal_key_results?: GoalKeyResult[]
}

const getCategoryLabel = (value: string) =>
  GOAL_CATEGORIES.find((c) => c.value === value)?.label || value

export function GoalsAdminTab() {
  const { data: activeCycle } = useActiveCycle()
  const { data: cycles } = usePerformanceCycles()
  const [selectedCycleId, setSelectedCycleId] = useState<string | undefined>(undefined)

  const cycleId = selectedCycleId || activeCycle?.id
  const { data: goals, isLoading } = useEmployeeGoals(cycleId)

  const goalsList = (goals || []) as GoalWithRelations[]

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
      header: 'Goal Title',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.goal_title}</span>
      ),
    },
    {
      id: 'cycle',
      header: 'Cycle',
      cell: ({ row }) => row.original.performance_cycle?.cycle_name || '-',
    },
    {
      id: 'category',
      header: 'Category',
      cell: ({ row }) => getCategoryLabel(row.original.category),
    },
    {
      accessorKey: 'weightage',
      header: 'Weightage',
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
                className="h-full bg-primary rounded-full transition-all"
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
        searchPlaceholder="Search goals..."
        isLoading={isLoading}
        toolbarActions={
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
        }
      />
    </div>
  )
}
