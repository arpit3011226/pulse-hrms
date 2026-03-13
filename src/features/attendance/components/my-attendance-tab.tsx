import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { FileEdit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ClockInOutCard } from './clock-in-out-card'
import { RegularizationDialog } from './regularization-dialog'
import { useCurrentEmployee, useMyAttendance, useMyRegularizations } from '../hooks/use-attendance'
import { formatTime, formatWorkHours, getMonthDateRange } from '../utils/attendance-utils'
import { formatDate } from '@/lib/utils'
import { MONTH_OPTIONS } from '@/lib/constants'
import type { AttendanceRecord, AttendanceRegularizationRequest } from '@/types/database.types'

export function MyAttendanceTab() {
  const { data: employee } = useCurrentEmployee()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year] = useState(now.getFullYear())

  const { start, end } = getMonthDateRange(year, month)
  const { data: records, isLoading } = useMyAttendance(employee?.id || '', start, end)
  const { data: regularizations } = useMyRegularizations(employee?.id || '')
  const [regRecord, setRegRecord] = useState<AttendanceRecord | null>(null)

  const columns: ColumnDef<AttendanceRecord>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      id: 'shift',
      header: 'Shift',
      cell: ({ row }) => {
        const shift = (row.original as unknown as Record<string, unknown>).shift as { name?: string } | null
        return shift?.name || '-'
      },
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
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <StatusBadge status={row.original.status} />
          {row.original.is_regularized && (
            <span className="text-[10px] text-muted-foreground">(R)</span>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => setRegRecord(row.original)}>
          <FileEdit className="mr-1 h-3 w-3" /> Regularize
        </Button>
      ),
    },
  ]

  const regColumns: ColumnDef<AttendanceRegularizationRequest>[] = [
    { accessorKey: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.date) },
    { accessorKey: 'reason', header: 'Reason', cell: ({ row }) => (
      <span className="max-w-[200px] truncate block text-sm">{row.original.reason}</span>
    )},
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: 'remarks', header: 'Remarks', cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.review_remarks || '-'}</span>
    )},
  ]

  return (
    <div className="space-y-6">
      <ClockInOutCard />

      <div className="flex items-center gap-2">
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_OPTIONS.map((m) => (
              <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{year}</span>
      </div>

      <DataTable
        columns={columns}
        data={(records || []) as AttendanceRecord[]}
        isLoading={isLoading}
        searchKey="date"
        searchPlaceholder="Search by date..."
      />

      {regularizations && regularizations.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium">My Regularization Requests</h3>
          <DataTable
            columns={regColumns}
            data={regularizations as AttendanceRegularizationRequest[]}
            searchKey="date"
            searchPlaceholder="Search requests..."
          />
        </div>
      )}

      <RegularizationDialog
        open={!!regRecord}
        onOpenChange={() => setRegRecord(null)}
        record={regRecord}
        employeeId={employee?.id || ''}
      />
    </div>
  )
}
