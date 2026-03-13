import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MarkAttendanceDialog } from './mark-attendance-dialog'
import { useAllAttendance, type AttendanceFilters } from '../hooks/use-attendance'
import { useDepartments } from '@/features/departments/hooks/use-departments'
import { formatTime, formatWorkHours } from '../utils/attendance-utils'
import { getInitials, formatDate } from '@/lib/utils'
import { ATTENDANCE_STATUSES } from '@/lib/constants'
import type { AttendanceRecordWithRelations } from '@/types/database.types'

export function AllAttendanceTab() {
  const [filters, setFilters] = useState<AttendanceFilters>({})
  const [markOpen, setMarkOpen] = useState(false)
  const { data: records, isLoading } = useAllAttendance(filters)
  const { data: departments } = useDepartments()

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
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.date),
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
      accessorKey: 'overtime_hours',
      header: 'OT',
      cell: ({ row }) => row.original.overtime_hours > 0 ? formatWorkHours(row.original.overtime_hours) : '-',
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
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="date"
          value={filters.start_date || ''}
          onChange={(e) => setFilters({ ...filters, start_date: e.target.value || undefined })}
          className="w-40"
          placeholder="From date"
        />
        <Input
          type="date"
          value={filters.end_date || ''}
          onChange={(e) => setFilters({ ...filters, end_date: e.target.value || undefined })}
          className="w-40"
          placeholder="To date"
        />
        <Select
          value={filters.department_id || 'all'}
          onValueChange={(v) => setFilters({ ...filters, department_id: v === 'all' ? undefined : v })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {(departments || []).map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? undefined : v })}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ATTENDANCE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={(records || []) as AttendanceRecordWithRelations[]}
        isLoading={isLoading}
        searchKey="employee"
        searchPlaceholder="Search attendance..."
        toolbarActions={
          <Button onClick={() => setMarkOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Mark Attendance
          </Button>
        }
      />

      <MarkAttendanceDialog open={markOpen} onOpenChange={setMarkOpen} />
    </div>
  )
}
