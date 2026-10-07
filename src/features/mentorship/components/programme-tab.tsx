import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { AlertTriangle, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/shared/data-table'
import { StatCard } from '@/components/shared/stat-card'
import { Users, UserCheck, Clock, HeartPulse } from 'lucide-react'
import { useMentorships, useMentorshipRequests } from '../hooks/use-mentorship'
import { useDateFiltered } from '@/hooks/use-date-range'
import { one } from '@/lib/supabase-embed'
import { formatDate } from '@/lib/utils'
import {
  HEALTH_LABELS, isOverdue, personName,
  type MentorshipPerson, type MentorshipRequestRow, type MentorshipRow,
} from '../types'

const HEALTH_STYLES: Record<string, string> = {
  on_track: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  needs_attention: 'bg-amber-100 text-amber-800 border-amber-200',
  stalled: 'bg-rose-100 text-rose-700 border-rose-200',
}

/**
 * The whole programme, for HR and leadership.
 *
 * Every pairing, what they agreed, when they last met and how they said it was
 * going. Not a word of what was said: the check-in notes are readable by the
 * two people in the mentorship and by nobody else, which is what makes people
 * willing to write anything worth reading.
 */
export function ProgrammeTab() {
  const { data: pairData, isLoading } = useMentorships()
  const { data: requestData } = useMentorshipRequests()

  const allPairs = (pairData ?? []) as unknown as MentorshipRow[]
  const requests = (requestData ?? []) as unknown as MentorshipRequestRow[]
  const pairs = useDateFiltered(allPairs, 'started_on')

  const active = useMemo(() => pairs.filter((m) => m.status === 'active'), [pairs])
  const overdue = useMemo(() => active.filter(isOverdue), [active])
  const struggling = useMemo(
    () => active.filter((m) => m.last_health && m.last_health !== 'on_track'),
    [active]
  )
  const pending = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests])

  const columns: ColumnDef<MentorshipRow>[] = [
    {
      id: 'mentee',
      header: 'Mentee',
      cell: ({ row }) => {
        const p = one(row.original.mentee as unknown) as MentorshipPerson | undefined
        const dept = one(p?.department as unknown) as { name?: string } | undefined
        return (
          <div>
            <p className="font-medium">{personName(p)}</p>
            <p className="text-xs text-muted-foreground">{dept?.name || '—'}</p>
          </div>
        )
      },
      accessorFn: (row) => personName(one(row.mentee as unknown) as MentorshipPerson),
    },
    {
      id: 'mentor',
      header: 'Mentor',
      cell: ({ row }) => {
        const p = one(row.original.mentor as unknown) as MentorshipPerson | undefined
        const dept = one(p?.department as unknown) as { name?: string } | undefined
        return (
          <div>
            <p className="font-medium">{personName(p)}</p>
            <p className="text-xs text-muted-foreground">{dept?.name || '—'}</p>
          </div>
        )
      },
    },
    {
      id: 'objective',
      header: 'Working towards',
      cell: ({ row }) => (
        <p className="line-clamp-2 max-w-sm text-sm text-muted-foreground">
          {row.original.objective || 'Not written down yet'}
        </p>
      ),
    },
    {
      id: 'checkins',
      header: 'Check-ins',
      cell: ({ row }) => {
        const m = row.original
        return (
          <div>
            <p className="text-sm">{m.checkin_count}</p>
            <p className="text-xs text-muted-foreground">
              {m.last_checkin_on ? `Last ${formatDate(m.last_checkin_on)}` : 'None yet'}
            </p>
          </div>
        )
      },
    },
    {
      id: 'health',
      header: 'How it is going',
      cell: ({ row }) => {
        const m = row.original
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {m.last_health ? (
              <Badge variant="outline" className={HEALTH_STYLES[m.last_health]}>
                {HEALTH_LABELS[m.last_health]}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">No check-in yet</span>
            )}
            {isOverdue(m) && (
              <Badge className="border-amber-200 bg-amber-100 text-amber-800">Overdue</Badge>
            )}
          </div>
        )
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status
        return (
          <Badge variant="outline">
            {s === 'active' ? 'Active' : s === 'completed' ? 'Completed' : 'Ended early'}
          </Badge>
        )
      },
    },
  ]

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active pairs" value={active.length} icon={Users} color="blue" />
        <StatCard
          title="Waiting for an answer"
          value={pending.length}
          icon={Clock}
          color="orange"
          description="Requests not yet accepted or declined"
        />
        <StatCard
          title="Check-in overdue"
          value={overdue.length}
          icon={AlertTriangle}
          color="amber"
          description="Past the date the pair agreed"
        />
        <StatCard
          title="Needing attention"
          value={struggling.length}
          icon={HeartPulse}
          color="rose"
          description="The pair said so themselves"
        />
      </div>

      <Card>
        <CardContent className="flex items-start gap-2 pt-5 text-sm text-muted-foreground">
          <Lock className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            You can see every pairing, what they agreed and how they say it is going. What is
            written in a check-in stays between the two people — that is deliberate, and it is why
            they are willing to write anything honest there.
          </span>
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <p className="flex items-center gap-1.5 pb-3 text-sm font-medium">
              <UserCheck className="h-3.5 w-3.5" /> Requests waiting for an answer
            </p>
            <div className="space-y-2">
              {pending.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <p className="text-sm">
                    <span className="font-medium">
                      {personName(one(r.mentee as unknown) as MentorshipPerson)}
                    </span>
                    {' asked '}
                    <span className="font-medium">
                      {personName(one(r.mentor as unknown) as MentorshipPerson)}
                    </span>
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(r.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <DataTable
        columns={columns}
        data={pairs}
        searchKey="mentee"
        searchPlaceholder="Search by mentee…"
        isLoading={isLoading}
      />
    </div>
  )
}
