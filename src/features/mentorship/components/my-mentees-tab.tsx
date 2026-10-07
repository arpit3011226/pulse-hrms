import { useMemo, useState } from 'react'
import { Inbox, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { MentorshipWorkspace } from './mentorship-workspace'
import { RespondRequestDialog } from './respond-request-dialog'
import { useMentorships, useMentorshipRequests } from '../hooks/use-mentorship'
import { one } from '@/lib/supabase-embed'
import { formatDate } from '@/lib/utils'
import {
  isOverdue, personName,
  type MentorshipPerson, type MentorshipRequestRow, type MentorshipRow,
} from '../types'

/** The mentor's side: who is waiting on an answer, and who you are carrying. */
export function MyMenteesTab({ myEmployeeId }: { myEmployeeId: string | undefined }) {
  const { data: pairs, isLoading } = useMentorships()
  const { data: requestData } = useMentorshipRequests()
  const [answering, setAnswering] = useState<MentorshipRequestRow | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const all = (pairs ?? []) as unknown as MentorshipRow[]
  const requests = (requestData ?? []) as unknown as MentorshipRequestRow[]

  const incoming = useMemo(
    () => requests.filter((r) => r.mentor_id === myEmployeeId && r.status === 'pending'),
    [requests, myEmployeeId]
  )
  const mentees = useMemo(
    () => all.filter((m) => m.mentor_id === myEmployeeId && m.status === 'active'),
    [all, myEmployeeId]
  )
  const finished = useMemo(
    () => all.filter((m) => m.mentor_id === myEmployeeId && m.status !== 'active'),
    [all, myEmployeeId]
  )

  const open = mentees.find((m) => m.id === openId)

  if (isLoading) return <Skeleton className="h-64 w-full" />

  if (open && myEmployeeId) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setOpenId(null)}>
          ← Back to all mentees
        </Button>
        <MentorshipWorkspace
          mentorship={open}
          myEmployeeId={myEmployeeId}
          myPart="mentor"
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {incoming.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="flex items-center gap-1.5 pb-3 text-sm font-medium">
              <Inbox className="h-3.5 w-3.5" /> Waiting on you
            </p>
            <div className="space-y-2">
              {incoming.map((r) => {
                const mentee = one(r.mentee as unknown) as MentorshipPerson | undefined
                return (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{personName(mentee)}</p>
                      <p className="text-xs text-muted-foreground">
                        {(one(mentee?.designation as unknown) as { title?: string } | undefined)
                          ?.title || 'Role not recorded'}
                        {' · asked '}
                        {formatDate(r.created_at)}
                      </p>
                      {r.goal_summary && (
                        <p className="pt-2 text-sm text-muted-foreground">{r.goal_summary}</p>
                      )}
                    </div>
                    <Button size="sm" onClick={() => setAnswering(r)}>
                      Read and answer
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {mentees.length === 0 && incoming.length === 0 ? (
        <EmptyState
          icon={Users}
          title="You are not mentoring anyone"
          description="Nobody has asked you yet. Adding a mentor profile tells people what you can help with, which makes a good match far more likely."
        />
      ) : (
        mentees.length > 0 && (
          <div>
            <h3 className="pb-3 text-sm font-medium">
              Your mentees
              <span className="pl-2 font-normal text-muted-foreground">
                {mentees.length} of 3
              </span>
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {mentees.map((m) => {
                const mentee = one(m.mentee as unknown) as MentorshipPerson | undefined
                return (
                  <Card key={m.id} className="cursor-pointer transition-colors hover:bg-accent/40">
                    <CardContent className="pt-5" onClick={() => setOpenId(m.id)}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">{personName(mentee)}</p>
                          <p className="text-xs text-muted-foreground">
                            Since {formatDate(m.started_on)}
                            {' · '}
                            {m.checkin_count} check-in{m.checkin_count === 1 ? '' : 's'}
                          </p>
                        </div>
                        {isOverdue(m) && (
                          <Badge className="border-amber-200 bg-amber-100 text-amber-800">
                            Overdue
                          </Badge>
                        )}
                      </div>
                      {m.objective && (
                        <p className="line-clamp-2 pt-2 text-sm text-muted-foreground">
                          {m.objective}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      )}

      {finished.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="pb-3 text-sm font-medium">People you have mentored</p>
            <div className="space-y-2">
              {finished.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {personName(one(m.mentee as unknown) as MentorshipPerson)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(m.started_on)} to {m.ended_on ? formatDate(m.ended_on) : '—'}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {m.status === 'completed' ? 'Completed' : 'Ended early'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mounted per request, so the objective starts from what that person wrote. */}
      {answering && (
        <RespondRequestDialog
          open
          onOpenChange={(o) => !o && setAnswering(null)}
          request={answering}
        />
      )}
    </div>
  )
}
