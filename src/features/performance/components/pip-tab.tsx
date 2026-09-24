import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, Pencil, Play, CheckCircle, XCircle, RefreshCw, Ban } from 'lucide-react'
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
import { PipFormDialog } from './pip-form-dialog'
import {
  usePerformanceImprovementPlans,
  useUpdatePIPStatus,
} from '../hooks/use-performance'
import { PIP_STATUSES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { PerformanceImprovementPlan } from '@/types/database.types'

interface PIPWithRelations extends PerformanceImprovementPlan {
  employee?: { id: string; first_name: string; last_name: string; email: string; employee_code: string } | null
}

const pipStatusLabel = (value: string) =>
  PIP_STATUSES.find((s) => s.value === value)?.label ?? value

export function PipTab() {
  const { data: pips, isLoading } = usePerformanceImprovementPlans()
  const updateStatus = useUpdatePIPStatus()

  const [formOpen, setFormOpen] = useState(false)
  const [editingPip, setEditingPip] = useState<PerformanceImprovementPlan | undefined>()
  const [statusAction, setStatusAction] = useState<{ id: string; status: string } | null>(null)

  const columns: ColumnDef<PIPWithRelations>[] = [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const emp = row.original.employee
        return emp ? (
          <span className="font-medium">{emp.first_name} {emp.last_name}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      },
    },
    {
      accessorKey: 'plan_title',
      header: 'Plan Title',
      cell: ({ row }) => <span className="font-medium">{row.original.plan_title}</span>,
    },
    {
      accessorKey: 'start_date',
      header: 'Start Date',
      cell: ({ row }) => formatDate(row.original.start_date),
    },
    {
      accessorKey: 'target_end_date',
      header: 'Target End Date',
      cell: ({ row }) => formatDate(row.original.target_end_date),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const pip = row.original
        const isDraft = pip.status === 'draft'
        const isActive = pip.status === 'active'
        const isExtended = pip.status === 'extended'
        const isTerminal = ['completed_successful', 'completed_unsuccessful', 'cancelled'].includes(pip.status)

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
                  setEditingPip(pip)
                  setFormOpen(true)
                }}
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>

              {!isTerminal && (
                <>
                  <DropdownMenuSeparator />

                  {isDraft && (
                    <DropdownMenuItem
                      onClick={() => setStatusAction({ id: pip.id, status: 'active' })}
                    >
                      <Play className="mr-2 h-4 w-4" /> Activate
                    </DropdownMenuItem>
                  )}

                  {(isActive || isExtended) && (
                    <>
                      <DropdownMenuItem
                        onClick={() => setStatusAction({ id: pip.id, status: 'completed_successful' })}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" /> Complete (Successful)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setStatusAction({ id: pip.id, status: 'completed_unsuccessful' })}
                      >
                        <XCircle className="mr-2 h-4 w-4" /> Complete (Unsuccessful)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setStatusAction({ id: pip.id, status: 'extended' })}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" /> Extend
                      </DropdownMenuItem>
                    </>
                  )}

                  {(isDraft || isActive || isExtended) && (
                    <DropdownMenuItem
                      onClick={() => setStatusAction({ id: pip.id, status: 'cancelled' })}
                    >
                      <Ban className="mr-2 h-4 w-4" /> Cancel
                    </DropdownMenuItem>
                  )}
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
        data={(pips || []) as PIPWithRelations[]}
        searchKey="plan_title"
        searchPlaceholder="Search PIPs..."
        isLoading={isLoading}
        toolbarActions={
          <Button
            onClick={() => {
              setEditingPip(undefined)
              setFormOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Create PIP
          </Button>
        }
      />

      <PipFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingPip(undefined)
        }}
        pip={editingPip}
      />

      <ConfirmDialog
        open={!!statusAction}
        onOpenChange={() => setStatusAction(null)}
        title="Change PIP Status"
        description={`Are you sure you want to change the status to "${statusAction ? pipStatusLabel(statusAction.status) : ''}"?`}
        confirmLabel="Confirm"
        isLoading={updateStatus.isPending}
        onConfirm={async () => {
          if (statusAction) {
            try {
              await updateStatus.mutateAsync(statusAction)
              toast.success('PIP status updated')
            } catch {
              toast.error('Failed to update PIP status')
            }
            setStatusAction(null)
          }
        }}
      />
    </>
  )
}
