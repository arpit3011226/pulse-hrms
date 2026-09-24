import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, Pencil, Trash2, Play, RefreshCw, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { CycleFormDialog } from './cycle-form-dialog'
import { SkippedEmployeesDialog } from './skipped-employees-dialog'
import {
  usePerformanceCycles,
  useDeletePerformanceCycle,
  useUpdateCycleStatus,
  useInitiateCycleReviews,
} from '../hooks/use-performance'
import { PERFORMANCE_CYCLE_TYPES, PERFORMANCE_CYCLE_STATUSES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { PerformanceCycle } from '@/types/database.types'

const cycleTypeLabel = (value: string) =>
  PERFORMANCE_CYCLE_TYPES.find((t) => t.value === value)?.label ?? value

const cycleStatusLabel = (value: string) =>
  PERFORMANCE_CYCLE_STATUSES.find((s) => s.value === value)?.label ?? value

export function CyclesTab() {
  const { data: cycles, isLoading } = usePerformanceCycles()
  const deleteCycle = useDeletePerformanceCycle()
  const updateStatus = useUpdateCycleStatus()
  const initiateReviews = useInitiateCycleReviews()

  const [formOpen, setFormOpen] = useState(false)
  const [editingCycle, setEditingCycle] = useState<PerformanceCycle | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [statusAction, setStatusAction] = useState<{ id: string; status: string } | null>(null)
  const [initiateId, setInitiateId] = useState<string | null>(null)
  const [skippedCycleId, setSkippedCycleId] = useState<string>('')

  const activeCycleExists = (cycles || []).some((c: PerformanceCycle) => c.status === 'active')

  const columns: ColumnDef<PerformanceCycle>[] = [
    {
      accessorKey: 'cycle_name',
      header: 'Cycle Name',
      cell: ({ row }) => <span className="font-medium">{row.original.cycle_name}</span>,
    },
    {
      accessorKey: 'cycle_code',
      header: 'Code',
    },
    {
      accessorKey: 'cycle_type',
      header: 'Type',
      cell: ({ row }) => cycleTypeLabel(row.original.cycle_type),
    },
    {
      id: 'period',
      header: 'Period',
      cell: ({ row }) => (
        <span>
          {formatDate(row.original.start_date)} - {formatDate(row.original.end_date)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const cycle = row.original
        const isDraft = cycle.status === 'draft'
        const isActive = cycle.status === 'active'

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditingCycle(cycle)
                  setFormOpen(true)
                }}
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>

              {isDraft && (
                <DropdownMenuItem
                  onClick={() => setStatusAction({ id: cycle.id, status: 'active' })}
                >
                  <Play className="mr-2 h-4 w-4" /> Activate
                </DropdownMenuItem>
              )}

              {isActive && (
                <DropdownMenuItem
                  onClick={() => setStatusAction({ id: cycle.id, status: 'goal_setting' })}
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Move to Goal Setting
                </DropdownMenuItem>
              )}

              {cycle.status === 'goal_setting' && (
                <DropdownMenuItem
                  onClick={() => setStatusAction({ id: cycle.id, status: 'self_review' })}
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Move to Self Review
                </DropdownMenuItem>
              )}

              {cycle.status === 'self_review' && (
                <DropdownMenuItem
                  onClick={() => setStatusAction({ id: cycle.id, status: 'manager_review' })}
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Move to Manager Review
                </DropdownMenuItem>
              )}

              {cycle.status === 'manager_review' && (
                <DropdownMenuItem
                  onClick={() => setStatusAction({ id: cycle.id, status: 'calibration' })}
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Move to Calibration
                </DropdownMenuItem>
              )}

              {cycle.status === 'calibration' && (
                <DropdownMenuItem
                  onClick={() => setStatusAction({ id: cycle.id, status: 'completed' })}
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Complete
                </DropdownMenuItem>
              )}

              {!isDraft && (
                <DropdownMenuItem onClick={() => setSkippedCycleId(cycle.id)}>
                  <UserX className="mr-2 h-4 w-4" /> View Skipped
                </DropdownMenuItem>
              )}

              {isDraft && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDeleteId(cycle.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={(cycles || []) as PerformanceCycle[]}
        searchKey="cycle_name"
        searchPlaceholder="Search cycles..."
        isLoading={isLoading}
        toolbarActions={
          <div className="flex items-center gap-2">
            {activeCycleExists && (
              <Button
                variant="outline"
                onClick={() => {
                  const active = (cycles || []).find(
                    (c: PerformanceCycle) => c.status === 'active'
                  )
                  if (active) setInitiateId(active.id)
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Initiate Reviews
              </Button>
            )}
            <Button
              onClick={() => {
                setEditingCycle(undefined)
                setFormOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Cycle
            </Button>
          </div>
        }
      />

      <CycleFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingCycle(undefined)
        }}
        cycle={editingCycle}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Cycle"
        description="Are you sure you want to delete this performance cycle? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteCycle.isPending}
        onConfirm={async () => {
          if (deleteId) {
            try {
              await deleteCycle.mutateAsync(deleteId)
              toast.success('Cycle deleted')
            } catch {
              toast.error('Failed to delete cycle')
            }
            setDeleteId(null)
          }
        }}
      />

      <ConfirmDialog
        open={!!statusAction}
        onOpenChange={() => setStatusAction(null)}
        title="Change Cycle Status"
        description={`Are you sure you want to change the status to "${statusAction ? cycleStatusLabel(statusAction.status) : ''}"?`}
        confirmLabel="Confirm"
        isLoading={updateStatus.isPending}
        onConfirm={async () => {
          if (statusAction) {
            try {
              await updateStatus.mutateAsync(statusAction)
              toast.success('Cycle status updated')
            } catch {
              toast.error('Failed to update cycle status')
            }
            setStatusAction(null)
          }
        }}
      />

      <ConfirmDialog
        open={!!initiateId}
        onOpenChange={() => setInitiateId(null)}
        title="Initiate Reviews"
        description="This will create performance reviews for eligible employees (skip criteria will be applied). Continue?"
        confirmLabel="Initiate"
        isLoading={initiateReviews.isPending}
        onConfirm={async () => {
          if (initiateId) {
            try {
              const result = await initiateReviews.mutateAsync(initiateId)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const r = result as any
              if (r && typeof r === 'object' && 'created' in r) {
                toast.success(`Reviews initiated: ${r.created} created, ${r.skipped} skipped`)
                if (r.skipped > 0) {
                  setSkippedCycleId(initiateId)
                }
              } else {
                toast.success('Reviews initiated successfully')
              }
            } catch {
              toast.error('Failed to initiate reviews')
            }
            setInitiateId(null)
          }
        }}
      />

      {skippedCycleId && (
        <SkippedEmployeesDialog
          open={!!skippedCycleId}
          onOpenChange={(open) => { if (!open) setSkippedCycleId('') }}
          cycleId={skippedCycleId}
        />
      )}
    </>
  )
}
