import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { Check, Eye, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { toast } from 'sonner'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { LeaveActionDialog } from './leave-action-dialog'
import { useCurrentEmployee, useTeamLeaveRequests, useAllLeaveBalances, useApproveLeave, useRejectLeave } from '../hooks/use-leave'
import { formatDate } from '@/lib/utils'
import type { LeaveRequestWithRelations, LeaveBalanceWithRelations } from '@/types/database.types'
import { useDateFiltered } from '@/hooks/use-date-range'

export function TeamLeavesTab() {
  const { data: employee } = useCurrentEmployee()
  const { data: requests, isLoading } = useTeamLeaveRequests(employee?.id || '')
  const currentYear = new Date().getFullYear()
  const { data: allBalances } = useAllLeaveBalances(currentYear)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestWithRelations | null>(null)

  // F48 — bulk approve. Approving fifteen leave requests one dialog at a time
  // is the single most common complaint about any HR system.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null)
  const [running, setRunning] = useState(false)
  const approveLeave = useApproveLeave()
  const rejectLeave = useRejectLeave()

  const getBalance = (req: LeaveRequestWithRelations) => {
    if (!allBalances) return null
    return (allBalances as LeaveBalanceWithRelations[]).find(
      (b) => b.employee_id === req.employee_id && b.leave_type_id === req.leave_type_id
    ) || null
  }

  const pending = ((requests || []) as LeaveRequestWithRelations[]).filter(
    (r) => r.status === 'pending'
  )
  const allPendingSelected = pending.length > 0 && pending.every((r) => selected.has(r.id))

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function runBulk() {
    if (!bulkAction || !employee) return
    setRunning(true)
    let ok = 0
    let failed = 0
    for (const req of pending.filter((r) => selected.has(r.id))) {
      const balance = getBalance(req)
      if (!balance) { failed++; continue }
      try {
        if (bulkAction === 'approve') {
          await approveLeave.mutateAsync({
            requestId: req.id,
            approvedBy: employee.id,
            totalDays: req.total_days,
            balanceId: balance.id,
            currentUsedDays: balance.used_days,
            currentPendingDays: balance.pending_days,
          })
        } else {
          await rejectLeave.mutateAsync({
            requestId: req.id,
            rejectionReason: 'Rejected in bulk by approver',
            totalDays: req.total_days,
            balanceId: balance.id,
            currentPendingDays: balance.pending_days,
          })
        }
        ok++
      } catch {
        failed++
      }
    }
    setRunning(false)
    setBulkAction(null)
    setSelected(new Set())
    if (failed === 0) {
      toast.success(`${ok} request${ok === 1 ? '' : 's'} ${bulkAction === 'approve' ? 'approved' : 'rejected'}`)
    } else {
      toast.warning(`${ok} done, ${failed} could not be processed — open those individually`)
    }
  }

  const columns: ColumnDef<LeaveRequestWithRelations>[] = [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={allPendingSelected}
          onCheckedChange={() =>
            setSelected(allPendingSelected ? new Set() : new Set(pending.map((r) => r.id)))
          }
          aria-label="Select all pending"
        />
      ),
      cell: ({ row }) =>
        row.original.status === 'pending' ? (
          <Checkbox
            checked={selected.has(row.original.id)}
            onCheckedChange={() => toggle(row.original.id)}
            aria-label="Select request"
          />
        ) : null,
    },
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const emp = row.original.employee
        return emp ? (
          <div>
            <Link
              to="/employees/$employeeId"
              params={{ employeeId: row.original.employee_id }}
              className="font-medium text-primary hover:underline"
            >
              {emp.first_name} {emp.last_name}
            </Link>
            <p className="text-xs text-muted-foreground">{emp.department?.name || ''}</p>
          </div>
        ) : '-'
      },
    },
    {
      id: 'leave_type',
      header: 'Leave Type',
      cell: ({ row }) => row.original.leave_type?.name || '-',
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
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(row.original)}>
          <Eye className="mr-1 h-4 w-4" />
          {row.original.status === 'pending' ? 'Review' : 'View'}
        </Button>
      ),
    },
  ]

  // Narrowed by the module's date filter, which sits beside the page title.
  const visibleRequests = useDateFiltered(
    (requests || []) as LeaveRequestWithRelations[],
    'start_date'
  )

  return (
    <>
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2">
          <span className="flex items-center gap-2 text-sm">
            <Badge variant="secondary">{selected.size}</Badge>
            selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => setBulkAction('reject')}
            >
              <X className="mr-1.5 h-3.5 w-3.5" /> Reject all
            </Button>
            <Button size="sm" onClick={() => setBulkAction('approve')}>
              <Check className="mr-1.5 h-3.5 w-3.5" /> Approve all
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={visibleRequests}
        searchKey="employee"
        searchPlaceholder="Search team members..."
        isLoading={isLoading}
      />

      <ConfirmDialog
        open={!!bulkAction}
        onOpenChange={() => !running && setBulkAction(null)}
        title={bulkAction === 'approve' ? `Approve ${selected.size} requests` : `Reject ${selected.size} requests`}
        description={
          bulkAction === 'approve'
            ? 'Leave balances will be updated for each person. Anything that cannot be processed is left alone and reported back.'
            : 'Each request will be rejected with a note that it was done in bulk. Open one individually if you want to give a specific reason.'
        }
        confirmLabel={running ? 'Working…' : bulkAction === 'approve' ? 'Approve all' : 'Reject all'}
        variant={bulkAction === 'reject' ? 'destructive' : 'default'}
        isLoading={running}
        onConfirm={runBulk}
      />

      {selectedRequest && employee && (
        <LeaveActionDialog
          open={!!selectedRequest}
          onOpenChange={(open) => { if (!open) setSelectedRequest(null) }}
          request={selectedRequest}
          balance={getBalance(selectedRequest)}
          approverId={employee.id}
        />
      )}
    </>
  )
}
