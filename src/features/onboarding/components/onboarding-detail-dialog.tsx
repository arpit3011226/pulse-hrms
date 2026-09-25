import { useState } from 'react'
import {
  CalendarCheck, Check, CircleDashed, Clock, Flag, Loader2, Plus, SkipForward, Trash2, X,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUpdateTaskStatus, useUpdateJourney, useAddOnboardingTask, useDeleteOnboardingTask } from '../hooks/use-onboarding'
import {
  CATEGORY_LABELS, CATEGORY_ORDER, OWNER_LABELS, taskProgress,
  type EmployeeOnboarding, type OnboardingCategory, type OnboardingTask,
} from '../types'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  run: EmployeeOnboarding | null
  currentEmployeeId?: string
}

const today = () => new Date().toISOString().split('T')[0]

function TaskRow({
  task, onSetStatus, busy, onDelete,
}: {
  task: OnboardingTask
  onSetStatus: (status: OnboardingTask['status']) => void
  busy: boolean
  onDelete?: () => void
}) {
  const done = task.status === 'completed'
  const skipped = task.status === 'skipped'
  const overdue = !done && !skipped && task.due_date && task.due_date < today()

  return (
    <div className="flex items-start gap-3 border-b py-2.5 last:border-0">
      <button
        type="button"
        disabled={busy || skipped}
        onClick={() => onSetStatus(done ? 'pending' : 'completed')}
        className="mt-0.5 shrink-0 disabled:opacity-40"
        aria-label={done ? 'Mark as not done' : 'Mark as done'}
      >
        {done ? (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
            <Check className="h-3.5 w-3.5 text-white" />
          </div>
        ) : (
          <CircleDashed className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`text-sm ${done || skipped ? 'text-muted-foreground line-through' : 'font-medium'}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{task.description}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            {OWNER_LABELS[task.owner_role] ?? task.owner_role}
          </Badge>
          {task.assignee && (
            <span className="text-[11px] text-muted-foreground">
              {task.assignee.first_name} {task.assignee.last_name}
            </span>
          )}
          {task.due_date && (
            <span className={`text-[11px] ${overdue ? 'font-medium text-rose-600' : 'text-muted-foreground'}`}>
              {overdue ? 'Overdue · ' : ''}{formatDate(task.due_date)}
            </span>
          )}
          {!task.is_mandatory && (
            <Badge variant="outline" className="text-[10px]">Optional</Badge>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {!done && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={busy}
            title={skipped ? 'Bring back' : 'Skip'}
            onClick={() => onSetStatus(skipped ? 'pending' : 'skipped')}
          >
            {skipped ? <X className="h-3.5 w-3.5" /> : <SkipForward className="h-3.5 w-3.5" />}
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            disabled={busy}
            title="Remove this task"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

export function OnboardingDetailDialog({ open, onOpenChange, run, currentEmployeeId }: Props) {
  const updateTask = useUpdateTaskStatus()
  const updateJourney = useUpdateJourney()
  const addTask = useAddOnboardingTask()
  const deleteTask = useDeleteOnboardingTask()
  const [journeyNotes, setJourneyNotes] = useState<Record<string, string>>({})
  const [newTask, setNewTask] = useState('')

  if (!run) return null

  const tasks = run.onboarding_tasks ?? []
  const journeys = [...(run.onboarding_journeys ?? [])].sort(
    (a, b) => a.milestone_days - b.milestone_days
  )
  const progress = taskProgress(tasks)
  const name = run.employee ? `${run.employee.first_name} ${run.employee.last_name}` : 'New joiner'

  async function setStatus(task: OnboardingTask, status: OnboardingTask['status']) {
    try {
      await updateTask.mutateAsync({ id: task.id, status, completedBy: currentEmployeeId })
    } catch {
      toast.error('Could not update the task')
    }
  }

  async function completeJourney(journeyId: string) {
    try {
      await updateJourney.mutateAsync({
        id: journeyId,
        status: 'completed',
        manager_notes: journeyNotes[journeyId] ?? null,
        completed_by: currentEmployeeId ?? null,
      })
      toast.success('Check-in recorded')
    } catch {
      toast.error('Could not record the check-in')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>
            Joined {formatDate(run.joining_date)}
            {run.employee?.designation?.title ? ` · ${run.employee.designation.title}` : ''}
            {run.buddy ? ` · Buddy: ${run.buddy.first_name} ${run.buddy.last_name}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">
              {progress.done} of {progress.total} tasks done
            </span>
            {progress.overdue > 0 && (
              <Badge className="bg-rose-100 text-rose-800">{progress.overdue} overdue</Badge>
            )}
          </div>
          <Progress value={progress.percent} className="h-2" />
        </div>

        <Tabs defaultValue="tasks" className="flex min-h-0 flex-1 flex-col">
          <TabsList>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="journey">Journey</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-4 min-h-0 flex-1">
            <ScrollArea className="h-[45vh] pr-3">
              {tasks.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No tasks. This onboarding was started without a template.
                </p>
              ) : (
                CATEGORY_ORDER.map((cat) => {
                  const inCat = tasks
                    .filter((t) => t.category === cat)
                    .sort((a, b) => a.sort_order - b.sort_order)
                  if (inCat.length === 0) return null
                  const catDone = inCat.filter((t) => t.status === 'completed').length
                  return (
                    <div key={cat} className="mb-5">
                      <div className="mb-1 flex items-center gap-2">
                        <h4 className="text-sm font-semibold">
                          {CATEGORY_LABELS[cat as OnboardingCategory]}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {catDone}/{inCat.length}
                        </span>
                      </div>
                      {inCat.map((t) => (
                        <TaskRow
                          key={t.id}
                          task={t}
                          busy={updateTask.isPending}
                          onSetStatus={(s) => setStatus(t, s)}
                          onDelete={async () => {
                            try {
                              await deleteTask.mutateAsync(t.id)
                              toast.success('Task removed')
                            } catch {
                              toast.error('Could not remove it')
                            }
                          }}
                        />
                      ))}
                    </div>
                  )
                })
              )}
            </ScrollArea>

            {/* Ad-hoc task — not everything fits a template */}
            <div className="mt-3 flex gap-2 border-t pt-3">
              <Input
                placeholder="Add a one-off task for this joiner"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
              />
              <Button
                size="sm"
                disabled={!newTask.trim() || addTask.isPending}
                onClick={async () => {
                  try {
                    await addTask.mutateAsync({
                      employee_onboarding_id: run!.id,
                      title: newTask.trim(),
                      category: 'ongoing',
                      owner_role: 'hr',
                      status: 'pending',
                      is_mandatory: false,
                      sort_order: tasks.length + 1,
                    })
                    setNewTask('')
                    toast.success('Task added')
                  } catch {
                    toast.error('Could not add it')
                  }
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="journey" className="mt-4 min-h-0 flex-1">
            <ScrollArea className="h-[45vh] pr-3">
              <div className="space-y-3">
                {journeys.map((j) => {
                  const due = j.due_date <= today()
                  const isDone = j.status === 'completed'
                  return (
                    <div key={j.id} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`mt-0.5 rounded-full p-1.5 ${
                              isDone ? 'bg-emerald-100' : due ? 'bg-amber-100' : 'bg-muted'
                            }`}
                          >
                            {isDone ? (
                              <CalendarCheck className="h-4 w-4 text-emerald-600" />
                            ) : due ? (
                              <Clock className="h-4 w-4 text-amber-600" />
                            ) : (
                              <Flag className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{j.milestone_days} day check-in</p>
                            <p className="text-xs text-muted-foreground">
                              Due {formatDate(j.due_date)}
                              {isDone && j.completed_at ? ` · done ${formatDate(j.completed_at)}` : ''}
                            </p>
                          </div>
                        </div>
                        {isDone ? (
                          <Badge className="bg-emerald-100 text-emerald-800">Done</Badge>
                        ) : due ? (
                          <Badge className="bg-amber-100 text-amber-800">Due</Badge>
                        ) : (
                          <Badge variant="outline">Upcoming</Badge>
                        )}
                      </div>

                      {isDone && j.manager_notes && (
                        <p className="mt-2 rounded bg-muted/50 p-2 text-xs">{j.manager_notes}</p>
                      )}

                      {!isDone && due && (
                        <div className="mt-3 space-y-2">
                          <Textarea
                            placeholder="How are they settling in?"
                            rows={2}
                            value={journeyNotes[j.id] ?? ''}
                            onChange={(e) =>
                              setJourneyNotes((prev) => ({ ...prev, [j.id]: e.target.value }))
                            }
                          />
                          <Button
                            size="sm"
                            disabled={updateJourney.isPending}
                            onClick={() => completeJourney(j.id)}
                          >
                            {updateJourney.isPending && (
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            )}
                            Record check-in
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
