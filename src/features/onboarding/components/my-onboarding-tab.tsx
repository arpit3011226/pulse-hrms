import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, CircleDashed, Loader2, Rocket } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { getCurrentEmployee } from '@/features/attendance/api/attendance.api'
import { useEmployeeOnboarding, useUpdateTaskStatus } from '../hooks/use-onboarding'
import { CATEGORY_LABELS, CATEGORY_ORDER, taskProgress, type OnboardingCategory } from '../types'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

/**
 * What a new joiner sees about their own onboarding.
 *
 * They can tick the tasks that are theirs; everything else is read-only so they
 * can see what is happening around them without being able to mark HR's or IT's
 * work as done.
 */
export function MyOnboardingTab() {
  const { profile } = useAuth()
  const { data: me } = useQuery({
    queryKey: ['current-employee', profile?.id],
    queryFn: () => getCurrentEmployee(profile!.id),
    enabled: !!profile?.id,
  })
  const myId = me?.id as string | undefined

  const { data: run, isLoading } = useEmployeeOnboarding(myId)
  const updateTask = useUpdateTaskStatus()

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </p>
    )
  }

  if (!run) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 rounded-full bg-muted p-3">
            <Rocket className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium">No onboarding for you</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Either you have been here a while, or HR has not started one yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  const tasks = run.onboarding_tasks ?? []
  const progress = taskProgress(tasks)
  const journeys = [...(run.onboarding_journeys ?? [])].sort(
    (a, b) => a.milestone_days - b.milestone_days
  )
  const nextCheckIn = journeys.find((j) => j.status === 'pending')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your first few months</CardTitle>
          <CardDescription>
            Joined {formatDate(run.joining_date)}
            {run.buddy ? ` · your buddy is ${run.buddy.first_name} ${run.buddy.last_name}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>{progress.done} of {progress.total} done</span>
            {nextCheckIn && (
              <span className="text-muted-foreground">
                Next check-in: {nextCheckIn.milestone_days} days · {formatDate(nextCheckIn.due_date)}
              </span>
            )}
          </div>
          <Progress value={progress.percent} className="h-2" />
        </CardContent>
      </Card>

      {CATEGORY_ORDER.map((cat) => {
        const inCat = tasks
          .filter((t) => t.category === cat)
          .sort((a, b) => a.sort_order - b.sort_order)
        if (inCat.length === 0) return null
        return (
          <Card key={cat}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {CATEGORY_LABELS[cat as OnboardingCategory]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {inCat.map((t) => {
                  const isMine = t.assigned_to === myId
                  const done = t.status === 'completed'
                  const overdue =
                    !done && t.due_date && t.due_date < new Date().toISOString().split('T')[0]
                  return (
                    <div key={t.id} className="flex items-start gap-3 py-2.5">
                      {done ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                      ) : (
                        <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${done ? 'text-muted-foreground line-through' : ''}`}>
                          {t.title}
                        </p>
                        {t.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {isMine ? (
                            <Badge variant="secondary" className="text-[10px]">Yours</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              Someone else is doing this
                            </Badge>
                          )}
                          {t.due_date && (
                            <span className={`text-[11px] ${overdue ? 'font-medium text-rose-600' : 'text-muted-foreground'}`}>
                              {overdue ? 'Overdue · ' : 'By '}{formatDate(t.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                      {isMine && !done && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateTask.isPending}
                          onClick={async () => {
                            try {
                              await updateTask.mutateAsync({
                                id: t.id, status: 'completed', completedBy: myId,
                              })
                              toast.success('Marked done')
                            } catch {
                              toast.error('Could not update it')
                            }
                          }}
                        >
                          Mark done
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
