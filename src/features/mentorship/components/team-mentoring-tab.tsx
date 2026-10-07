import { useMemo } from 'react'
import { Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useMentorships } from '../hooks/use-mentorship'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import { one } from '@/lib/supabase-embed'
import { formatDate } from '@/lib/utils'
import {
  HEALTH_LABELS, isOverdue, personName,
  type MentorshipPerson, type MentorshipRow,
} from '../types'

const HEALTH_STYLES: Record<string, string> = {
  on_track: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  needs_attention: 'bg-amber-100 text-amber-800 border-amber-200',
  stalled: 'bg-rose-100 text-rose-700 border-rose-200',
}

/**
 * What the people reporting to me are doing in the programme.
 *
 * Both directions on purpose. A report being mentored is the obvious half; a
 * report who mentors somebody in another department is the half managers
 * usually find out about by accident, and it is their time being spent.
 *
 * What was said in their check-ins is not here, and will not be. A manager sees
 * that the pair is meeting and how they say it is going.
 */
export function TeamMentoringTab({ myEmployeeId }: { myEmployeeId: string | undefined }) {
  const { data: pairData, isLoading } = useMentorships()
  const { data: employees } = useEmployees()

  const pairs = (pairData ?? []) as unknown as MentorshipRow[]

  const myReportIds = useMemo(() => {
    const ids = new Set<string>()
    for (const e of employees ?? []) {
      if (e.reporting_manager_id === myEmployeeId) ids.add(e.id)
    }
    return ids
  }, [employees, myEmployeeId])

  const beingMentored = useMemo(
    () => pairs.filter((m) => m.status === 'active' && myReportIds.has(m.mentee_id)),
    [pairs, myReportIds]
  )
  const mentoring = useMemo(
    () => pairs.filter((m) => m.status === 'active' && myReportIds.has(m.mentor_id)),
    [pairs, myReportIds]
  )

  if (isLoading) return <Skeleton className="h-64 w-full" />

  if (beingMentored.length === 0 && mentoring.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Nobody on your team is in the programme"
        description="When one of your reports takes a mentor, or agrees to mentor somebody, it will show here."
      />
    )
  }

  return (
    <div className="space-y-5">
      <Section
        title="Your reports who have a mentor"
        rows={beingMentored}
        nameOf={(m) => personName(one(m.mentee as unknown) as MentorshipPerson)}
        otherLabel="Mentored by"
        otherOf={(m) => personName(one(m.mentor as unknown) as MentorshipPerson)}
      />
      <Section
        title="Your reports who are mentoring someone"
        rows={mentoring}
        nameOf={(m) => personName(one(m.mentor as unknown) as MentorshipPerson)}
        otherLabel="Mentoring"
        otherOf={(m) => personName(one(m.mentee as unknown) as MentorshipPerson)}
      />
    </div>
  )
}

function Section({
  title, rows, nameOf, otherLabel, otherOf,
}: {
  title: string
  rows: MentorshipRow[]
  nameOf: (m: MentorshipRow) => string
  otherLabel: string
  otherOf: (m: MentorshipRow) => string
}) {
  if (rows.length === 0) return null
  return (
    <div>
      <h3 className="pb-3 text-sm font-medium">
        {title}
        <span className="pl-2 font-normal text-muted-foreground">{rows.length}</span>
      </h3>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((m) => (
          <Card key={m.id}>
            <CardContent className="pt-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{nameOf(m)}</p>
                  <p className="text-xs text-muted-foreground">
                    {otherLabel} {otherOf(m)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {m.last_health && (
                    <Badge variant="outline" className={HEALTH_STYLES[m.last_health]}>
                      {HEALTH_LABELS[m.last_health]}
                    </Badge>
                  )}
                  {isOverdue(m) && (
                    <Badge className="border-amber-200 bg-amber-100 text-amber-800">
                      Overdue
                    </Badge>
                  )}
                </div>
              </div>
              <p className="pt-2 text-xs text-muted-foreground">
                Since {formatDate(m.started_on)}
                {' · '}
                {m.checkin_count} check-in{m.checkin_count === 1 ? '' : 's'}
                {m.last_checkin_on ? `, last on ${formatDate(m.last_checkin_on)}` : ''}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
