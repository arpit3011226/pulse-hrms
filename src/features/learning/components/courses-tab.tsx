import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, Pencil, Trash2, Eye, Play, Archive, FileText } from 'lucide-react'
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
import { CourseFormDialog } from './course-form-dialog'
import { CourseDetailDialog } from './course-detail-dialog'
import { useTrainingCourses, useUpdateCourseStatus, useDeleteCourse } from '../hooks/use-learning'
import { usePermissions } from '@/hooks/use-permissions'
import { getCourseModeLabel } from '../utils/learning-utils'
import { toast } from 'sonner'

export function CoursesTab() {
  const { canManageLearning, isAdmin, isHR } = usePermissions()
  const canManage = canManageLearning || isAdmin || isHR

  const { data: courses, isLoading } = useTrainingCourses()
  const updateStatus = useUpdateCourseStatus()
  const deleteCourse = useDeleteCourse()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(undefined)
  const [detailCourse, setDetailCourse] = useState<any>(undefined)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [statusChange, setStatusChange] = useState<{ id: string; status: string; label: string } | null>(null)

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'course_name',
      header: 'Course',
      cell: ({ row }) => (
        <button
          className="text-left font-medium text-primary hover:underline"
          onClick={() => setDetailCourse(row.original)}
        >
          {row.original.course_name}
        </button>
      ),
    },
    {
      accessorKey: 'course_code',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.course_code}</span>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => row.original.category?.category_name || '—',
    },
    {
      accessorKey: 'mode',
      header: 'Mode',
      cell: ({ row }) => (
        <Badge variant="outline">{getCourseModeLabel(row.original.mode)}</Badge>
      ),
    },
    {
      accessorKey: 'duration_hours',
      header: 'Duration',
      cell: ({ row }) => row.original.duration_hours ? `${row.original.duration_hours}h` : '—',
    },
    {
      accessorKey: 'is_mandatory',
      header: 'Mandatory',
      cell: ({ row }) => (
        <Badge variant={row.original.is_mandatory ? 'default' : 'secondary'}>
          {row.original.is_mandatory ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    ...(canManage ? [{
      id: 'actions',
      cell: ({ row }: any) => {
        const s = row.original.status
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDetailCourse(row.original)}>
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setEditing(row.original); setFormOpen(true) }}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {s === 'draft' && (
                <DropdownMenuItem onClick={() => setStatusChange({ id: row.original.id, status: 'published', label: 'Publish' })}>
                  <Play className="mr-2 h-4 w-4" /> Publish
                </DropdownMenuItem>
              )}
              {s === 'published' && (
                <DropdownMenuItem onClick={() => setStatusChange({ id: row.original.id, status: 'archived', label: 'Archive' })}>
                  <Archive className="mr-2 h-4 w-4" /> Archive
                </DropdownMenuItem>
              )}
              {s === 'archived' && (
                <DropdownMenuItem onClick={() => setStatusChange({ id: row.original.id, status: 'draft', label: 'Move to Draft' })}>
                  <FileText className="mr-2 h-4 w-4" /> Move to Draft
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(row.original.id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    }] as ColumnDef<any>[] : []),
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={courses ?? []}
        isLoading={isLoading}
        searchKey="course_name"
        searchPlaceholder="Search courses..."
        toolbarActions={
          canManage ? (
            <Button onClick={() => { setEditing(undefined); setFormOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" /> Add Course
            </Button>
          ) : undefined
        }
      />

      <CourseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        course={editing}
      />

      <CourseDetailDialog
        open={!!detailCourse}
        onOpenChange={() => setDetailCourse(undefined)}
        course={detailCourse}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Course"
        description="This will permanently delete the course and all related enrollments and assessments. Are you sure?"
        onConfirm={async () => {
          try {
            await deleteCourse.mutateAsync(deleteId!)
            toast.success('Course deleted')
            setDeleteId(null)
          } catch (err: any) {
            toast.error(err.message || 'Failed to delete')
          }
        }}
        isLoading={deleteCourse.isPending}
      />

      <ConfirmDialog
        open={!!statusChange}
        onOpenChange={() => setStatusChange(null)}
        title={`${statusChange?.label} Course`}
        description={`Are you sure you want to ${statusChange?.label.toLowerCase()} this course?`}
        onConfirm={async () => {
          try {
            await updateStatus.mutateAsync({ id: statusChange!.id, status: statusChange!.status })
            toast.success(`Course ${statusChange!.label.toLowerCase()}ed`)
            setStatusChange(null)
          } catch (err: any) {
            toast.error(err.message || 'Failed to update status')
          }
        }}
        isLoading={updateStatus.isPending}
      />
    </>
  )
}
