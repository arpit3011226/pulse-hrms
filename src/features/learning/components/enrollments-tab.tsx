import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EnrollDialog } from './enroll-dialog'
import { useEnrollments, useUpdateEnrollment, useDeleteEnrollment } from '../hooks/use-learning'
import { ENROLLMENT_STATUSES } from '@/lib/constants'
import { toast } from 'sonner'

export function EnrollmentsTab() {
  const { data: enrollments, isLoading } = useEnrollments()
  const updateEnrollment = useUpdateEnrollment()
  const deleteEnrollment = useDeleteEnrollment()

  const [enrollOpen, setEnrollOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const payload: any = { id, status }
      if (status === 'completed') {
        payload.progress_percent = 100
        payload.completion_date = new Date().toISOString().split('T')[0]
      }
      await updateEnrollment.mutateAsync(payload)
      toast.success('Enrollment updated')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update')
    }
  }

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const e = row.original.employee
        return e ? `${e.first_name} ${e.last_name} (${e.employee_code})` : '—'
      },
    },
    {
      accessorKey: 'course',
      header: 'Course',
      cell: ({ row }) => {
        const c = row.original.course
        return c ? `${c.course_name} (${c.course_code})` : '—'
      },
    },
    {
      accessorKey: 'enrolled_date',
      header: 'Enrolled',
      cell: ({ row }) => row.original.enrolled_date,
    },
    {
      accessorKey: 'progress_percent',
      header: 'Progress',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${row.original.progress_percent}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{row.original.progress_percent}%</span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {ENROLLMENT_STATUSES.filter((s) => s.value !== row.original.status).map((s) => (
              <DropdownMenuItem
                key={s.value}
                onClick={() => handleStatusChange(row.original.id, s.value)}
              >
                <Pencil className="mr-2 h-4 w-4" /> Mark {s.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteId(row.original.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={enrollments ?? []}
        isLoading={isLoading}
        searchKey="employee"
        searchPlaceholder="Search enrollments..."
        toolbarActions={
          <Button onClick={() => setEnrollOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Enroll Employees
          </Button>
        }
      />

      <EnrollDialog open={enrollOpen} onOpenChange={setEnrollOpen} />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Remove Enrollment"
        description="Are you sure you want to remove this enrollment?"
        onConfirm={async () => {
          try {
            await deleteEnrollment.mutateAsync(deleteId!)
            toast.success('Enrollment removed')
            setDeleteId(null)
          } catch (err: any) {
            toast.error(err.message || 'Failed to remove')
          }
        }}
        isLoading={deleteEnrollment.isPending}
      />
    </>
  )
}
