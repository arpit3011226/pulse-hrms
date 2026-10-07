import { useState } from 'react'
import {
  CalendarClock, CheckCircle2, Lock, Plus, Target, Trash2, XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  useAddMentorshipGoal, useDeleteMentorshipGoal, useMentorshipCheckins,
  useMentorshipGoals, useUpdateMentorshipGoal,
} from '../hooks/use-mentorship'
import { LogCheckinDialog } from './log-checkin-dialog'
import { EndMentorshipDialog } from './end-mentorship-dialog'
import { one } from '@/lib/supabase-embed'
import { formatDate } from '@/lib/utils'
import {
  FREQUENCY_LABELS, HEALTH_LABELS, isOverdue, personName,
  type MentorshipCheckinRow, type MentorshipGoalRow,
  type MentorshipPerson, type MentorshipRow,
} from '../types'
import { toast } from 'sonner'

const HEALTH_STYLES: Record<string, string> = {
  on_track: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  needs_attention: 'bg-amber-100 text-amber-800 border-amber-200',
  stalled: 'bg-rose-100 text-rose-700 border-rose-200',
}

interface MentorshipWorkspaceProps {
  mentorship: MentorshipRow
  /** The signed-in person's employee id. */
  myEmployeeId: string
  /** 'mentee' when I am being mentored here, 'mentor' when I am mentoring. */
  myPart: 'mentee' | 'mentor'
}

/**
 * The inside of one mentorship — what they agreed, what they are working on,
 * and the record of their conversations.
 *
 * Both people see the same thing. The check-in notes shown here are readable by
 * these two and nobody else, which is the point of the programme: people only
 * say the useful things when they know it is not being reported upwards.
 */
export function MentorshipWorkspace({
  mentorship, myEmployeeId, myPart,
}: MentorshipWorkspaceProps) {
  const { data: goalData } = useMentorshipGoals(mentorship.id)
  const { data: checkinData } = useMentorshipCheckins(mentorship.id)

  // PostgREST hands these back untyped; the shapes live in ../types.
  const goals = (goalData ?? []) as unknown as MentorshipGoalRow[]
  const checkins = (checkinData ?? []) as unknown as MentorshipCheckinRow[]
  const addGoal = useAddMentorshipGoal()
  const updateGoal = useUpdateMentorshipGoal()
  const deleteGoal = useDeleteMentorshipGoal()

  const [goalTitle, setGoalTitle] = useState('')
  const [goalDate, setGoalDate] = useState('')
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)

  const other = one(
    (myPart === 'mentee' ? mentorship.mentor : mentorship.mentee) as unknown
  ) as MentorshipPerson | undefined

  const isLive = mentorship.status === 'active'
  const overdue = isOverdue(mentorship)

  async function handleAddGoal() {
    const title = goalTitle.trim()
    if (!title) return
    try {
      await addGoal.mutateAsync({
        mentorship_id: mentorship.id,
        title,
        target_date: goalDate || null,
        created_by: myEmployeeId,
      })
      setGoalTitle('')
      setGoalDate('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add the goal')
    }
  }

  return (
    <div className="space-y-5">
      {/* What was agreed */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {myPart === 'mentee' ? 'Your mentor' : 'You are mentoring'}
              </p>
              <h3 className="text-lg font-semibold">{personName(other)}</h3>
              <p className="text-sm text-muted-foreground">
                {(one(other?.designation as unknown) as { title?: string } | undefined)?.title ||
                  'Role not recorded'}
                {' · '}
                {(one(other?.department as unknown) as { name?: string } | undefined)?.name ||
                  'No department'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isLive && (
                <Badge variant="outline">
                  {mentorship.status === 'completed' ? 'Completed' : 'Ended'}
                </Badge>
              )}
              {isLive && overdue && (
                <Badge className="border-amber-200 bg-amber-100 text-amber-800">
                  Check-in overdue
                </Badge>
              )}
              {mentorship.last_health && (
                <Badge variant="outline" className={HEALTH_STYLES[mentorship.last_health]}>
                  {HEALTH_LABELS[mentorship.last_health]}
                </Badge>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Started</p>
              <p className="pt-1 text-sm">{formatDate(mentorship.started_on)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Meeting</p>
              <p className="pt-1 text-sm">{FREQUENCY_LABELS[mentorship.checkin_frequency]}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="h-3 w-3" /> Next check-in
              </p>
              <p className={`pt-1 text-sm ${overdue ? 'font-medium text-amber-700' : ''}`}>
                {mentorship.next_checkin_on ? formatDate(mentorship.next_checkin_on) : '—'}
              </p>
            </div>
          </div>

          {mentorship.objective && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-xs text-muted-foreground">What you agreed to work towards</p>
                <p className="whitespace-pre-wrap pt-1 text-sm">{mentorship.objective}</p>
              </div>
            </>
          )}

          {!isLive && mentorship.end_reason && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-xs text-muted-foreground">Closing note</p>
                <p className="whitespace-pre-wrap pt-1 text-sm">{mentorship.end_reason}</p>
              </div>
            </>
          )}

          {isLive && (
            <div className="flex flex-wrap gap-2 pt-5">
              <Button size="sm" onClick={() => setCheckinOpen(true)}>
                <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Log a check-in
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEndOpen(true)}>
                Finish this mentorship
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" /> Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing agreed yet. A mentorship works better with two or three clear things to aim
              at.
            </p>
          ) : (
            <div className="space-y-2">
              {goals.map((g) => (
                <div
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        g.status === 'achieved' ? 'text-muted-foreground line-through' : ''
                      }`}
                    >
                      {g.title}
                    </p>
                    {g.target_date && (
                      <p className="text-xs text-muted-foreground">
                        By {formatDate(g.target_date)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {g.status === 'open' && isLive && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() =>
                            updateGoal.mutate({ id: g.id, status: 'achieved' })
                          }
                        >
                          <CheckCircle2 className="mr-1.5 h-3 w-3" /> Achieved
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => updateGoal.mutate({ id: g.id, status: 'dropped' })}
                        >
                          <XCircle className="mr-1.5 h-3 w-3" /> Drop
                        </Button>
                      </>
                    )}
                    {g.status !== 'open' && (
                      <Badge variant="outline" className="text-[10px]">
                        {g.status === 'achieved' ? 'Achieved' : 'Dropped'}
                      </Badge>
                    )}
                    {isLive && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => deleteGoal.mutate(g.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                        <span className="sr-only">Remove this goal</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isLive && (
            <div className="flex flex-wrap items-end gap-2 pt-1">
              <div className="min-w-[200px] flex-1 space-y-1.5">
                <Label className="text-xs">Add a goal</Label>
                <Input
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddGoal()
                    }
                  }}
                  placeholder="e.g. Lead a design review on my own"
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">By when</Label>
                <Input
                  type="date"
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                />
              </div>
              <Button onClick={handleAddGoal} disabled={!goalTitle.trim() || addGoal.isPending}>
                <Plus className="mr-2 h-3.5 w-3.5" /> Add
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-ins */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            Check-ins
            <Badge variant="outline" className="gap-1 text-[10px] font-normal">
              <Lock className="h-2.5 w-2.5" /> Just the two of you
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="pb-3 text-xs text-muted-foreground">
            What you write here is readable by you and {personName(other)} and by nobody else — not
            HR, not leadership, not your manager. They can see that you met and how it is going,
            never what was said.
          </p>

          {checkins.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No check-ins yet.
            </p>
          ) : (
            <div className="space-y-3">
              {checkins.map((c) => {
                const author = one(c.logged_by_employee as unknown) as
                  | MentorshipPerson
                  | undefined
                return (
                  <div key={c.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{formatDate(c.checkin_date)}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={HEALTH_STYLES[c.health]}>
                          {HEALTH_LABELS[c.health]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {personName(author)}
                        </span>
                      </div>
                    </div>
                    {c.notes && (
                      <p className="whitespace-pre-wrap pt-2 text-sm">{c.notes}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mounted only while open, so each one starts from a clean form. */}
      {checkinOpen && (
        <LogCheckinDialog
          open
          onOpenChange={setCheckinOpen}
          mentorship={mentorship}
          myEmployeeId={myEmployeeId}
        />
      )}
      {endOpen && (
        <EndMentorshipDialog
          open
          onOpenChange={setEndOpen}
          mentorship={mentorship}
          otherPersonId={myPart === 'mentee' ? mentorship.mentor_id : mentorship.mentee_id}
        />
      )}
    </div>
  )
}
