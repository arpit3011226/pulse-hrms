import { useMemo, useState } from 'react'
import { Clock, Compass, History } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { MentorshipWorkspace } from './mentorship-workspace'
import {
  useMentorships, useMentorshipRequests, useWithdrawRequest,
} from '../hooks/use-mentorship'
import { one } from '@/lib/supabase-embed'
import { formatDate } from '@/lib/utils'
import {
  personName, type MentorshipPerson, type MentorshipRequestRow, type MentorshipRow,
} from '../types'
import { toast } from 'sonner'

/** Where a mentee stands: who they asked, who they got, and what went before. */
export function MyMentorshipTab({ myEmployeeId }: { myEmployeeId: string | undefined }) {
  const { data: pairs, isLoading } = useMentorships()
  const { data: requestData } = useMentorshipRequests()
  const withdraw = useWithdrawRequest()
  const [withdrawId, setWithdrawId] = useState<string | null>(null)

  const all = (pairs ?? []) as unknown as MentorshipRow[]
  const requests = (requestData ?? []) as unknown as MentorshipRequestRow[]

  const active = useMemo(
    () => all.find((m) => m.mentee_id === myEmployeeId && m.status === 'active'),
    [all, myEmployeeId]
  )
  const past = useMemo(
    () => all.filter((m) => m.mentee_id === myEmployeeId && m.status !== 'active'),
    [all, myEmployeeId]
  )
  const pending = useMemo(
    () => requests.find((r) => r.mentee_id === myEmployeeId && r.status === 'pending'),
    [requests, myEmployeeId]
  )
  const declined = useMemo(
    () => requests.filter((r) => r.mentee_id === myEmployeeId && r.status === 'declined'),
    [requests, myEmployeeId]
  )

  if (isLoading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-5">
      {pending && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> Waiting for an answer
                </p>
                <p className="pt-1 font-medium">
                  You asked {personName(one(pending.mentor as unknown) as MentorshipPerson)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Sent {formatDate(pending.created_at)}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setWithdrawId(pending.id)}>
                Withdraw
              </Button>
            </div>
            {pending.goal_summary && (
              <p className="whitespace-pre-wrap pt-3 text-sm text-muted-foreground">
                {pending.goal_summary}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {active && myEmployeeId ? (
        <MentorshipWorkspace
          mentorship={active}
          myEmployeeId={myEmployeeId}
          myPart="mentee"
        />
      ) : (
        !pending && (
          <EmptyState
            icon={Compass}
            title="You do not have a mentor yet"
            description="Have a look at Find a Mentor. You can ask anyone — people who have offered to mentor are listed first, with what they can help with."
          />
        )
      )}

      {declined.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="pb-3 text-sm font-medium">Requests that were declined</p>
            <div className="space-y-2">
              {declined.map((r) => (
                <div key={r.id} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">
                    {personName(one(r.mentor as unknown) as MentorshipPerson)}
                  </p>
                  {r.decline_reason && (
                    <p className="pt-1 text-sm text-muted-foreground">{r.decline_reason}</p>
                  )}
                  <p className="pt-1 text-xs text-muted-foreground">
                    {r.decided_at ? formatDate(r.decided_at) : ''}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {past.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="flex items-center gap-1.5 pb-3 text-sm font-medium">
              <History className="h-3.5 w-3.5" /> Mentorships you have had
            </p>
            <div className="space-y-2">
              {past.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {personName(one(m.mentor as unknown) as MentorshipPerson)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(m.started_on)} to {m.ended_on ? formatDate(m.ended_on) : '—'}
                      {' · '}
                      {m.checkin_count} check-in{m.checkin_count === 1 ? '' : 's'}
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

      <ConfirmDialog
        open={!!withdrawId}
        onOpenChange={() => setWithdrawId(null)}
        title="Withdraw your request"
        description="They will no longer see it. You will be free to ask somebody else."
        confirmLabel="Withdraw"
        isLoading={withdraw.isPending}
        onConfirm={async () => {
          if (!withdrawId) return
          try {
            await withdraw.mutateAsync(withdrawId)
            toast.success('Request withdrawn')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not withdraw it')
          }
          setWithdrawId(null)
        }}
      />
    </div>
  )
}
