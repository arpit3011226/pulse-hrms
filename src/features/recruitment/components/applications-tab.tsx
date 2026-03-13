import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, ArrowRightLeft, XCircle, PauseCircle, MinusCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
import { ApplicationFormDialog } from './application-form-dialog'
import { MoveStageDialog } from './move-stage-dialog'
import {
  useCandidateApplications,
  useUpdateCandidateApplicationStatus,
} from '../hooks/use-recruitment'
import { usePermissions } from '@/hooks/use-permissions'
import { formatDate } from '@/lib/utils'
import type { CandidateApplicationWithRelations } from '@/types/database.types'
import { toast } from 'sonner'

export function ApplicationsTab() {
  const { canManageRecruitment, isAdmin, isHR } = usePermissions()
  const canManage = canManageRecruitment || isAdmin || isHR

  const { data: applications, isLoading } = useCandidateApplications()
  const updateStatus = useUpdateCandidateApplicationStatus()

  const [formOpen, setFormOpen] = useState(false)
  const [moveStageApp, setMoveStageApp] = useState<CandidateApplicationWithRelations | undefined>()
  const [statusChange, setStatusChange] = useState<{
    id: string
    status: string
    label: string
  } | null>(null)

  const getStatusActions = (currentStatus: string) => {
    const actions: { status: string; label: string; icon: typeof XCircle }[] = []
    if (currentStatus !== 'rejected' && currentStatus !== 'withdrawn' && currentStatus !== 'hired') {
      actions.push({ status: 'rejected', label: 'Reject', icon: XCircle })
      actions.push({ status: 'withdrawn', label: 'Withdraw', icon: MinusCircle })
    }
    if (currentStatus !== 'on_hold' && currentStatus !== 'rejected' && currentStatus !== 'withdrawn' && currentStatus !== 'hired') {
      actions.push({ status: 'on_hold', label: 'On Hold', icon: PauseCircle })
    }
    return actions
  }

  const columns: ColumnDef<CandidateApplicationWithRelations>[] = [
    {
      id: 'candidate_name',
      header: 'Candidate',
      cell: ({ row }) => {
        const c = row.original.candidate
        return c ? (
          <span className="font-medium">{c.first_name} {c.last_name}</span>
        ) : '-'
      },
      accessorFn: (row) =>
        row.candidate ? `${row.candidate.first_name} ${row.candidate.last_name}` : '',
    },
    {
      id: 'job_title',
      header: 'Job Title',
      cell: ({ row }) => row.original.job_requisition?.title || '-',
    },
    {
      id: 'requisition_code',
      header: 'Requisition Code',
      cell: ({ row }) =>
        row.original.job_requisition?.requisition_code ? (
          <Badge variant="outline">{row.original.job_requisition.requisition_code}</Badge>
        ) : '-',
    },
    {
      id: 'current_stage',
      header: 'Current Stage',
      cell: ({ row }) =>
        row.original.current_stage?.stage_name ? (
          <Badge variant="secondary">{row.original.current_stage.stage_name}</Badge>
        ) : (
          <span className="text-muted-foreground">Not assigned</span>
        ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'applied_date',
      header: 'Applied Date',
      cell: ({ row }) => formatDate(row.original.applied_date),
    },
  ]

  if (canManage) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => {
        const app = row.original
        const statusActions = getStatusActions(app.status)
        const canMoveStage =
          app.status !== 'rejected' &&
          app.status !== 'withdrawn' &&
          app.status !== 'hired'

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canMoveStage && (
                <DropdownMenuItem onClick={() => setMoveStageApp(app)}>
                  <ArrowRightLeft className="mr-2 h-4 w-4" /> Move Stage
                </DropdownMenuItem>
              )}
              {statusActions.length > 0 && canMoveStage && <DropdownMenuSeparator />}
              {statusActions.map((action) => (
                <DropdownMenuItem
                  key={action.status}
                  className={action.status === 'rejected' ? 'text-destructive' : undefined}
                  onClick={() =>
                    setStatusChange({ id: app.id, status: action.status, label: action.label })
                  }
                >
                  <action.icon className="mr-2 h-4 w-4" /> {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    })
  }

  const getStatusChangeDescription = () => {
    if (!statusChange) return ''
    if (statusChange.status === 'rejected') {
      return `Are you sure you want to reject this application? This will mark the candidate as rejected. You can provide a rejection reason if needed.`
    }
    if (statusChange.status === 'withdrawn') {
      return `Are you sure you want to withdraw this application? This action indicates the candidate has withdrawn from the process.`
    }
    return `Are you sure you want to change this application's status to "${statusChange.label}"?`
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={(applications || []) as CandidateApplicationWithRelations[]}
        searchKey="candidate_name"
        searchPlaceholder="Search applications..."
        isLoading={isLoading}
        toolbarActions={
          canManage && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Application
            </Button>
          )
        }
      />

      <ApplicationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
      />

      <MoveStageDialog
        open={!!moveStageApp}
        onOpenChange={(open) => { if (!open) setMoveStageApp(undefined) }}
        application={moveStageApp}
      />

      <ConfirmDialog
        open={!!statusChange}
        onOpenChange={() => setStatusChange(null)}
        title={`${statusChange?.label || 'Change'} Application`}
        description={getStatusChangeDescription()}
        confirmLabel={statusChange?.label || 'Confirm'}
        variant={statusChange?.status === 'rejected' ? 'destructive' : 'default'}
        isLoading={updateStatus.isPending}
        onConfirm={async () => {
          if (statusChange) {
            try {
              await updateStatus.mutateAsync({
                id: statusChange.id,
                status: statusChange.status,
                rejectionReason:
                  statusChange.status === 'rejected'
                    ? 'Rejected via application management'
                    : undefined,
              })
              toast.success(`Application status changed to ${statusChange.label}`)
            } catch {
              toast.error('Failed to update application status')
            }
            setStatusChange(null)
          }
        }}
      />
    </>
  )
}
