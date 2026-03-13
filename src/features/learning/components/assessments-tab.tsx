import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, Pencil, Trash2, ClipboardCheck } from 'lucide-react'
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
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { AssessmentFormDialog } from './assessment-form-dialog'
import { AttemptDialog } from './attempt-dialog'
import { useAllAssessments, useDeleteAssessment } from '../hooks/use-learning'
import type { TrainingAssessment } from '@/types/database.types'
import { toast } from 'sonner'

export function AssessmentsTab() {
  const { data: assessments, isLoading } = useAllAssessments()
  const deleteAssessment = useDeleteAssessment()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TrainingAssessment | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [attemptAssessment, setAttemptAssessment] = useState<TrainingAssessment | null>(null)

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'assessment_name',
      header: 'Assessment',
      cell: ({ row }) => <span className="font-medium">{row.original.assessment_name}</span>,
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
      accessorKey: 'assessment_type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.assessment_type.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      accessorKey: 'passing_marks',
      header: 'Pass / Total',
      cell: ({ row }) => `${row.original.passing_marks} / ${row.original.total_marks}`,
    },
    {
      accessorKey: 'duration_minutes',
      header: 'Duration',
      cell: ({ row }) => row.original.duration_minutes ? `${row.original.duration_minutes} min` : '—',
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
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setAttemptAssessment(row.original)}>
              <ClipboardCheck className="mr-2 h-4 w-4" /> Record Attempt
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setEditing(row.original); setFormOpen(true) }}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(row.original.id)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
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
        data={assessments ?? []}
        isLoading={isLoading}
        searchKey="assessment_name"
        searchPlaceholder="Search assessments..."
        toolbarActions={
          <Button onClick={() => { setEditing(undefined); setFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Add Assessment
          </Button>
        }
      />

      <AssessmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        assessment={editing}
      />

      <AttemptDialog
        open={!!attemptAssessment}
        onOpenChange={() => setAttemptAssessment(null)}
        assessment={attemptAssessment}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Assessment"
        description="This will permanently delete the assessment and all related attempts. Are you sure?"
        onConfirm={async () => {
          try {
            await deleteAssessment.mutateAsync(deleteId!)
            toast.success('Assessment deleted')
            setDeleteId(null)
          } catch (err: any) {
            toast.error(err.message || 'Failed to delete')
          }
        }}
        isLoading={deleteAssessment.isPending}
      />
    </>
  )
}
