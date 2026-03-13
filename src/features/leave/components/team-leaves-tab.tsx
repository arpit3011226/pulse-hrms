import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { LeaveActionDialog } from './leave-action-dialog'
import { useCurrentEmployee, useTeamLeaveRequests, useAllLeaveBalances } from '../hooks/use-leave'
import { formatDate } from '@/lib/utils'
import type { LeaveRequestWithRelations, LeaveBalanceWithRelations } from '@/types/database.types'

export function TeamLeavesTab() {
  const { data: employee } = useCurrentEmployee()
  const { data: requests, isLoading } = useTeamLeaveRequests(employee?.id || '')
  const currentYear = new Date().getFullYear()
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

  return (
    <>
      <DataTable
        columns={columns}
        data={(requests || []) as LeaveRequestWithRelations[]}
        searchKey="employee"
        searchPlaceholder="Search team members..."
        isLoading={isLoading}
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
