import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { RegularizationActionDialog } from './regularization-action-dialog'
import { useCurrentEmployee, useTeamAttendance, useTeamRegularizations } from '../hooks/use-attendance'
import { formatTime, formatWorkHours, getTodayDateString } from '../utils/attendance-utils'
import { getInitials, formatDate } from '@/lib/utils'
import type { AttendanceRecordWithRelations, RegularizationRequestWithRelations } from '@/types/database.types'

export function TeamAttendanceTab() {
  const { data: employee } = useCurrentEmployee()
  const [date, setDate] = useState(getTodayDateString())
  const { data: records, isLoading } = useTeamAttendance(employee?.id || '', date)
  const { data: regularizations } = useTeamRegularizations(employee?.id || '')
  const [reviewRequest, setReviewRequest] = useState<RegularizationRequestWithRelations | null>(null)

  const pendingRegs = (regularizations || []).filter(
    (r: Record<string, unknown>) => r.status === 'pending'
  ) as RegularizationRequestWithRelations[]

  const columns: ColumnDef<AttendanceRecordWithRelations>[] = [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const emp = row.original.employee
        if (!emp) return '-'
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={emp.avatar_url || undefined} />
              <AvatarFallback className="text-xs">{getInitials(emp.first_name, emp.last_name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{emp.first_name} {emp.last_name}</p>
              <p className="text-xs text-muted-foreground">{emp.department?.name || ''}</p>
            </div>
          </div>
        )
      },
    },
    {
      id: 'shift',
      header: 'Shift',
      cell: ({ row }) => row.original.shift?.name || '-',
    },
    {
      id: 'clock_in',
      header: 'Clock In',
      cell: ({ row }) => formatTime(row.original.clock_in),
    },
    {
      id: 'clock_out',
      header: 'Clock Out',
      cell: ({ row }) => formatTime(row.original.clock_out),
    },
    {
      accessorKey: 'work_hours',
      header: 'Work Hours',
      cell: ({ row }) => formatWorkHours(row.original.work_hours),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ]

  const regColumns: ColumnDef<RegularizationRequestWithRelations>[] = [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const emp = row.original.employee
        return emp ? `${emp.first_name} ${emp.last_name}` : '-'
      },
    },
    { accessorKey: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.date) },
    { accessorKey: 'reason', header: 'Reason', cell: ({ row }) => (
      <span className="max-w-[200px] truncate block text-sm">{row.original.reason}</span>
    )},
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: 'actions',
      cell: ({ row }) => {
        if (row.original.status !== 'pending') return null
        return (
          <Button variant="ghost" size="sm" onClick={() => setReviewRequest(row.original)}>
            <Eye className="mr-1 h-3 w-3" /> Review
          </Button>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-48"
        />
      </div>

      <DataTable
        columns={columns}
        data={(records || []) as AttendanceRecordWithRelations[]}
        isLoading={isLoading}
        searchKey="employee"
        searchPlaceholder="Search team..."
      />

      {pendingRegs.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium">Pending Regularization Requests ({pendingRegs.length})</h3>
          <DataTable
            columns={regColumns}
            data={pendingRegs}
            searchKey="employee"
            searchPlaceholder="Search requests..."
          />
        </div>
      )}

      <RegularizationActionDialog
        open={!!reviewRequest}
        onOpenChange={() => setReviewRequest(null)}
        request={reviewRequest}
      />
    </div>
  )
}
