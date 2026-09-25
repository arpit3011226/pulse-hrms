import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { LeaveBalanceCards } from './leave-balance-cards'
import { ApplyLeaveDialog } from './apply-leave-dialog'
import { useCurrentEmployee, useMyLeaveRequests, useMyLeaveBalances, useCancelLeave } from '../hooks/use-leave'
import { formatDate } from '@/lib/utils'
import type { LeaveRequestWithRelations, LeaveBalanceWithRelations } from '@/types/database.types'
import { toast } from 'sonner'
import { useDateFiltered } from '@/hooks/use-date-range'

export function MyLeavesTab() {
  const { data: employee } = useCurrentEmployee()
  const currentYear = new Date().getFullYear()
  const { data: requests, isLoading: requestsLoading } = useMyLeaveRequests(employee?.id || '')
  const { data: balances, isLoading: balancesLoading } = useMyLeaveBalances(employee?.id || '', currentYear)
  const cancelLeave = useCancelLeave()
  const [applyOpen, setApplyOpen] = useState(false)
  const [cancelRequest, setCancelRequest] = useState<LeaveRequestWithRelations | null>(null)

  const columns: ColumnDef<LeaveRequestWithRelations>[] = [
    {
      id: 'leave_type',
      header: 'Leave Type',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.leave_type?.name || '-'}</span>
      ),
    },
    {
      accessorKey: 'start_date',
      header: 'From',
      cell: ({ row }) => formatDate(row.original.start_date),
    },
    {
      accessorKey: 'end_date',
      header: 'To',
      cell: ({ row }) => formatDate(row.original.end_date),
    },
    {
      accessorKey: 'total_days',
      header: 'Days',
      cell: ({ row }) => (
        <span>
          {row.original.total_days}
          {row.original.is_half_day && (
            <span className="ml-1 text-xs text-muted-foreground">
              ({row.original.half_day_period?.replace('_', ' ')})
            </span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate block text-sm text-muted-foreground">
          {row.original.reason || '-'}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        if (row.original.status !== 'pending') return null
        return (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setCancelRequest(row.original)}
          >
            <XCircle className="mr-1 h-4 w-4" /> Cancel
          </Button>
        )
      },
    },
  ]

  const getCancelBalance = () => {
    if (!cancelRequest || !balances) return null
    return (balances as LeaveBalanceWithRelations[]).find(
      (b) => b.leave_type_id === cancelRequest.leave_type_id
    ) || null
  }

  // Narrowed by the module's date filter, which sits beside the page title.
  const visibleRequests = useDateFiltered(
    (requests || []) as LeaveRequestWithRelations[],
    'start_date'
  )

  return (
    <div className="space-y-6">
      <LeaveBalanceCards
        balances={(balances || []) as LeaveBalanceWithRelations[]}
        isLoading={balancesLoading}
      />

      <DataTable
        columns={columns}
        data={visibleRequests}
        searchKey="leave_type"
        searchPlaceholder="Search leave requests..."
        isLoading={requestsLoading}
        toolbarActions={
          <Button onClick={() => setApplyOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Apply Leave
          </Button>
        }
      />

      <ApplyLeaveDialog open={applyOpen} onOpenChange={setApplyOpen} />

      <ConfirmDialog
        open={!!cancelRequest}
        onOpenChange={() => setCancelRequest(null)}
        title="Cancel Leave Request"
        description="Are you sure you want to cancel this leave request?"
        confirmLabel="Cancel Request"
        variant="destructive"
        isLoading={cancelLeave.isPending}
        onConfirm={async () => {
          if (!cancelRequest) return
          const balance = getCancelBalance()
          if (!balance) {
            toast.error('Balance record not found')
            setCancelRequest(null)
            return
          }
          try {
            await cancelLeave.mutateAsync({
              requestId: cancelRequest.id,
              totalDays: cancelRequest.total_days,
              balanceId: balance.id,
              currentPendingDays: balance.pending_days,
            })
            toast.success('Leave request cancelled')
          } catch {
            toast.error('Failed to cancel leave request')
          }
          setCancelRequest(null)
        }}
      />
    </div>
  )
}
