import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, Pencil, CheckCircle, XCircle, MessageSquare, Star , CalendarClock } from 'lucide-react'
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
import { RescheduleInterviewDialog } from './reschedule-interview-dialog'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { InterviewFormDialog } from './interview-form-dialog'
import { InterviewFeedbackDialog } from './interview-feedback-dialog'
import {
  useInterviews,
  useUpdateInterviewStatus,
} from '../hooks/use-recruitment'
import { usePermissions } from '@/hooks/use-permissions'
import { formatDate } from '@/lib/utils'
import { INTERVIEW_MODES } from '@/lib/constants'
import type { InterviewWithRelations } from '@/types/database.types'
import { toast } from 'sonner'

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export function InterviewsTab() {
  const [rescheduleTarget, setRescheduleTarget] = useState<InterviewWithRelations | null>(null)
  const { canManageRecruitment, isAdmin, isHR } = usePermissions()
  const canManage = canManageRecruitment || isAdmin || isHR

  const { data: interviews, isLoading } = useInterviews()
  const updateStatus = useUpdateInterviewStatus()

  const [formOpen, setFormOpen] = useState(false)
  const [editingInterview, setEditingInterview] = useState<InterviewWithRelations | undefined>()
  const [feedbackInterview, setFeedbackInterview] = useState<InterviewWithRelations | undefined>()
  const [statusChange, setStatusChange] = useState<{
    id: string
    status: string
    label: string
  } | null>(null)

  const columns: ColumnDef<InterviewWithRelations>[] = [
    {
      id: 'candidate',
      header: 'Candidate',
      cell: ({ row }) => {
        const c = row.original.candidate_application?.candidate
        return c ? (
          <span className="font-medium">{c.first_name} {c.last_name}</span>
        ) : '-'
      },
      accessorFn: (row) => {
        const c = row.candidate_application?.candidate
        return c ? `${c.first_name} ${c.last_name}` : ''
      },
    },
    {
      id: 'job',
      header: 'Job',
      cell: ({ row }) => row.original.candidate_application?.job_requisition?.title || '-',
    },
    {
      id: 'stage',
      header: 'Stage',
      cell: ({ row }) =>
        row.original.interview_stage?.stage_name ? (
          <Badge variant="secondary">{row.original.interview_stage.stage_name}</Badge>
        ) : '-',
    },
    {
      id: 'interviewer',
      header: 'Interviewer',
      cell: ({ row }) => {
        const i = row.original.interviewer
        return i ? `${i.first_name} ${i.last_name}` : '-'
      },
    },
    {
      id: 'scheduled',
      header: 'Scheduled Date/Time',
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{formatDate(row.original.scheduled_start)}</div>
          <div className="text-muted-foreground">
            {formatTime(row.original.scheduled_start)} - {formatTime(row.original.scheduled_end)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'mode',
      header: 'Mode',
      cell: ({ row }) => {
        const label = INTERVIEW_MODES.find((m) => m.value === row.original.mode)?.label
        return label || row.original.mode || '-'
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'feedback',
      header: 'Feedback',
      cell: ({ row }) => {
        const fb = row.original.interview_feedback
        if (!fb) return <span className="text-muted-foreground text-sm">-</span>
        return (
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{fb.rating ?? '-'}</span>
          </div>
        )
      },
    },
  ]

  if (canManage) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => {
        const interview = row.original
        const isScheduled = interview.status === 'scheduled' || interview.status === 'rescheduled'
        const isCompleted = interview.status === 'completed'

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isScheduled && (
                <DropdownMenuItem
                  onClick={() => {
                    setEditingInterview(interview)
                    setFormOpen(true)
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              {isScheduled && (
                <DropdownMenuItem onClick={() => setRescheduleTarget(interview)}>
                  <CalendarClock className="mr-2 h-4 w-4" /> Reschedule
                </DropdownMenuItem>
              )}
              {isScheduled && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() =>
                      setStatusChange({ id: interview.id, status: 'completed', label: 'Mark Complete' })
                    }
                  >
                    <CheckCircle className="mr-2 h-4 w-4" /> Mark Complete
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() =>
                      setStatusChange({ id: interview.id, status: 'cancelled', label: 'Cancel' })
                    }
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Cancel
                  </DropdownMenuItem>
                </>
              )}
              {isCompleted && (
                <DropdownMenuItem onClick={() => setFeedbackInterview(interview)}>
                  <MessageSquare className="mr-2 h-4 w-4" /> {interview.interview_feedback ? 'Edit Feedback' : 'Submit Feedback'}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    })
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={(interviews || []) as InterviewWithRelations[]}
        searchKey="candidate"
        searchPlaceholder="Search interviews..."
        isLoading={isLoading}
        toolbarActions={
          canManage && (
            <Button
              onClick={() => {
                setEditingInterview(undefined)
                setFormOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Schedule Interview
            </Button>
          )
        }
      />

      <RescheduleInterviewDialog
        open={!!rescheduleTarget}
        onOpenChange={(o) => !o && setRescheduleTarget(null)}
        interview={rescheduleTarget}
      />


      <InterviewFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingInterview(undefined)
        }}
        interview={editingInterview}
      />

      <InterviewFeedbackDialog
        open={!!feedbackInterview}
        onOpenChange={(open) => {
          if (!open) setFeedbackInterview(undefined)
        }}
        interview={feedbackInterview}
      />

      <ConfirmDialog
        open={!!statusChange}
        onOpenChange={() => setStatusChange(null)}
        title="Change Interview Status"
        description={`Are you sure you want to ${statusChange?.status === 'completed' ? 'mark this interview as completed' : 'cancel this interview'}?`}
        confirmLabel={statusChange?.label || 'Confirm'}
        variant={statusChange?.status === 'cancelled' ? 'destructive' : 'default'}
        isLoading={updateStatus.isPending}
        onConfirm={async () => {
          if (statusChange) {
            try {
              await updateStatus.mutateAsync({ id: statusChange.id, status: statusChange.status })
              toast.success(`Interview ${statusChange.status === 'completed' ? 'marked as completed' : 'cancelled'}`)
            } catch {
              toast.error('Failed to update interview status')
            }
            setStatusChange(null)
          }
        }}
      />
    </>
  )
}
