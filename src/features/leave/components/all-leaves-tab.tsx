import { useState, useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { LeaveActionDialog } from './leave-action-dialog'
import {
  useCurrentEmployee,
  useAllLeaveRequests,
  useAllLeaveBalances,
  type LeaveRequestFilters,
} from '../hooks/use-leave'
import { formatDate } from '@/lib/utils'
import { LEAVE_STATUSES } from '@/lib/constants'
import type { LeaveRequestWithRelations, LeaveBalanceWithRelations } from '@/types/database.types'
import { useDateFiltered } from '@/hooks/use-date-range'

export function AllLeavesTab() {
  const { data: employee } = useCurrentEmployee()
  const currentYear = new Date().getFullYear()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const filters = useMemo<LeaveRequestFilters | undefined>(() => {
    if (statusFilter === 'all') return undefined
    return { status: statusFilter }
  }, [statusFilter])

  const { data: requests, isLoading } = useAllLeaveRequests(filters)
  const { data: allBalances } = useAllLeaveBalances(currentYear)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestWithRelations | null>(null)

  const getBalance = (req: LeaveRequestWithRelations) => {
    if (!allBalances) return null
    return (allBalances as LeaveBalanceWithRelations[]).find(
      (b) => b.employee_id === req.employee_id && b.leave_type_id === req.leave_type_id
    ) || null
  }

  const columns: ColumnDef<LeaveRequestWithRelations>[] = [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const emp = row.original.employee
        return emp ? (
          <div>
            <p className="font-medium">{emp.first_name} {emp.last_name}</p>
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
      cell: ({ row }) => (
        <span>
          {row.original.total_days}
          {row.original.is_half_day && <span className="text-xs ml-1">(half)</span>}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'created_at',
      header: 'Applied',
      cell: ({ row }) => formatDate(row.original.created_at, 'relative'),
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
      <DataTable
        columns={columns}
        data={visibleRequests}
        searchKey="employee"
        searchPlaceholder="Search employees..."
        isLoading={isLoading}
        toolbarActions={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {LEAVE_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
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
