import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, Pencil, Trash2, Eye, Play, Pause, XCircle, CheckCircle, Send, Gavel } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { RequisitionFormDialog } from './requisition-form-dialog'
import { RequisitionDetailDialog } from './requisition-detail-dialog'
import { RequisitionApprovalDialog, ApprovalBadge } from './requisition-approval-dialog'
import {
  useJobRequisitions,
  useUpdateJobRequisitionStatus,
  useDeleteJobRequisition,
} from '../hooks/use-recruitment'
import { usePermissions } from '@/hooks/use-permissions'
import type { JobRequisitionWithRelations } from '@/types/database.types'
import { toast } from 'sonner'
import { EMPLOYMENT_TYPES } from '@/lib/constants'

export function RequisitionsTab() {
  const { canManageRecruitment, isAdmin, isHR } = usePermissions()
  const canManage = canManageRecruitment || isAdmin || isHR

  const { data: requisitions, isLoading } = useJobRequisitions()
  const updateStatus = useUpdateJobRequisitionStatus()
  const deleteRequisition = useDeleteJobRequisition()

  const [formOpen, setFormOpen] = useState(false)
  const [editingRequisition, setEditingRequisition] = useState<JobRequisitionWithRelations | undefined>()
  const [detailRequisition, setDetailRequisition] = useState<JobRequisitionWithRelations | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [statusChange, setStatusChange] = useState<{ id: string; status: string; label: string } | null>(null)
  const [approval, setApproval] = useState<{ req: JobRequisitionWithRelations; mode: 'submit' | 'decide' } | null>(null)

  const getStatusActions = (currentStatus: string) => {
    const actions: { status: string; label: string; icon: typeof Play }[] = []
    switch (currentStatus) {
      case 'draft':
        actions.push({ status: 'open', label: 'Open', icon: Play })
        break
      case 'open':
        actions.push({ status: 'on_hold', label: 'Put On Hold', icon: Pause })
        actions.push({ status: 'closed', label: 'Close', icon: XCircle })
        actions.push({ status: 'filled', label: 'Mark Filled', icon: CheckCircle })
        actions.push({ status: 'cancelled', label: 'Cancel', icon: XCircle })
        break
      case 'on_hold':
        actions.push({ status: 'open', label: 'Reopen', icon: Play })
        actions.push({ status: 'cancelled', label: 'Cancel', icon: XCircle })
        break
      default:
        break
    }
    return actions
  }

  const columns: ColumnDef<JobRequisitionWithRelations>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <button
          className="text-left font-medium text-primary hover:underline"
          onClick={() => setDetailRequisition(row.original)}
        >
          {row.original.title}
        </button>
      ),
    },
    {
      accessorKey: 'requisition_code',
      header: 'Code',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.requisition_code || '-'}</Badge>
      ),
    },
    {
      id: 'department',
      header: 'Department',
      cell: ({ row }) => {
        const dept = (row.original as unknown as Record<string, unknown>).department as { name: string } | undefined
        return dept?.name || '-'
      },
    },
    {
      accessorKey: 'employment_type',
      header: 'Type',
      cell: ({ row }) => {
        const label = EMPLOYMENT_TYPES.find((t) => t.value === row.original.employment_type)?.label
        return label || row.original.employment_type || '-'
      },
    },
    {
      accessorKey: 'headcount',
      header: 'Headcount',
      cell: ({ row }) => row.original.headcount || 1,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'approval',
      header: 'Approval',
      cell: ({ row }) => (
        <ApprovalBadge status={(row.original as { approval_status?: string | null }).approval_status} />
      ),
    },
  ]

  if (canManage) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => {
        const req = row.original
        const statusActions = getStatusActions(req.status)

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDetailRequisition(req)}>
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setEditingRequisition(req); setFormOpen(true) }}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {(() => {
                const a = (req as { approval_status?: string | null }).approval_status
                if (a === 'pending') {
                  return (
                    <DropdownMenuItem onClick={() => setApproval({ req, mode: 'decide' })}>
                      <Gavel className="mr-2 h-4 w-4" /> Approve or Reject
                    </DropdownMenuItem>
                  )
                }
                if (a !== 'approved') {
                  return (
                    <DropdownMenuItem onClick={() => setApproval({ req, mode: 'submit' })}>
                      <Send className="mr-2 h-4 w-4" /> Send for Approval
                    </DropdownMenuItem>
                  )
                }
                return null
              })()}
              {statusActions.length > 0 && <DropdownMenuSeparator />}
              {statusActions.map((action) => (
                <DropdownMenuItem
                  key={action.status}
                  onClick={() => setStatusChange({ id: req.id, status: action.status, label: action.label })}
                >
                  <action.icon className="mr-2 h-4 w-4" /> {action.label}
                </DropdownMenuItem>
              ))}
              {req.status === 'draft' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(req.id)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    })
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={(requisitions || []) as JobRequisitionWithRelations[]}
        searchKey="title"
        searchPlaceholder="Search requisitions..."
        isLoading={isLoading}
        toolbarActions={
          canManage && (
            <Button onClick={() => { setEditingRequisition(undefined); setFormOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" /> Add Requisition
            </Button>
          )
        }
      />

      <RequisitionFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingRequisition(undefined) }}
        requisition={editingRequisition}
      />


      <RequisitionApprovalDialog
        open={!!approval}
        onOpenChange={(open) => !open && setApproval(null)}
        requisition={approval?.req ?? null}
        mode={approval?.mode ?? 'submit'}
      />

      <RequisitionDetailDialog
        open={!!detailRequisition}
        onOpenChange={(open) => { if (!open) setDetailRequisition(undefined) }}
        requisition={detailRequisition}
      />

      <ConfirmDialog
        open={!!statusChange}
        onOpenChange={() => setStatusChange(null)}
        title="Change Requisition Status"
        description={`Are you sure you want to change this requisition's status to "${statusChange?.label || ''}"?`}
        confirmLabel={statusChange?.label || 'Confirm'}
        variant={statusChange?.status === 'cancelled' ? 'destructive' : 'default'}
        isLoading={updateStatus.isPending}
        onConfirm={async () => {
          if (statusChange) {
            try {
              await updateStatus.mutateAsync({ id: statusChange.id, status: statusChange.status })
              toast.success(`Requisition status changed to ${statusChange.label}`)
            } catch {
              toast.error('Failed to update requisition status')
            }
            setStatusChange(null)
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Requisition"
        description="This will permanently delete this draft requisition. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteRequisition.isPending}
        onConfirm={async () => {
          if (deleteId) {
            try {
              await deleteRequisition.mutateAsync(deleteId)
              toast.success('Requisition deleted')
            } catch {
              toast.error('Failed to delete requisition')
            }
            setDeleteId(null)
          }
        }}
      />
    </>
  )
}
