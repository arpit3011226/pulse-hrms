import { useMemo, useState } from 'react'
import { Search, UserPlus, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { RequestMentorDialog } from './request-mentor-dialog'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import { useMentorDirectory } from '../hooks/use-mentorship'
import { one } from '@/lib/supabase-embed'
import { getInitials } from '@/lib/utils'
import { personName, type MentorProfileRow, type MentorshipPerson } from '../types'

interface FindMentorTabProps {
  myEmployeeId: string | undefined
  /** Set when they already have a mentor, which means they cannot ask for another. */
  hasActiveMentor: boolean
  hasPendingRequest: boolean
}

/**
 * Who you could ask.
 *
 * People who have offered to mentor come first, with what they can help with,
 * because that is where a good match is most likely. Anyone else in the company
 * can still be asked — the brief was that you may pick whoever you like, and
 * some of the best mentors never get round to filling in a profile.
 */
export function FindMentorTab({
  myEmployeeId, hasActiveMentor, hasPendingRequest,
}: FindMentorTabProps) {
  const { data: directory, isLoading } = useMentorDirectory()
  const { data: employees } = useEmployees()
  const [query, setQuery] = useState('')
  const [target, setTarget] = useState<MentorshipPerson | null>(null)

  const volunteers = (directory ?? []) as unknown as MentorProfileRow[]
  const volunteerIds = useMemo(
    () => new Set(volunteers.map((v) => v.employee_id)),
    [volunteers]
  )

  const q = query.trim().toLowerCase()

  const matchingVolunteers = useMemo(() => {
    return volunteers.filter((v) => {
      if (v.employee_id === myEmployeeId) return false
      if (!q) return true
      const person = one(v.employee as unknown) as MentorshipPerson | undefined
      const haystack = [
        personName(person),
        v.headline ?? '',
        (v.focus_areas ?? []).join(' '),
      ].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [volunteers, q, myEmployeeId])

  // Only offered once someone searches, so the page opens on the volunteers
  // rather than on a list of everybody in the company.
  const otherPeople = useMemo(() => {
    if (!q) return []
    return (employees ?? [])
      .filter((e) => {
        if (e.id === myEmployeeId) return false
        if (volunteerIds.has(e.id)) return false
        if (e.status !== 'active') return false
        return `${e.first_name} ${e.last_name}`.toLowerCase().includes(q)
      })
      .slice(0, 12)
  }, [employees, q, myEmployeeId, volunteerIds])

  if (isLoading) return <Skeleton className="h-64 w-full" />

  if (hasActiveMentor) {
    return (
      <EmptyState
        icon={Users}
        title="You already have a mentor"
        description="You can have one mentor at a time. When that mentorship finishes, you can ask somebody new."
      />
    )
  }

  if (hasPendingRequest) {
    return (
      <EmptyState
        icon={Users}
        title="Your request is waiting for an answer"
        description="You can have one request open at a time. Withdraw it from My Mentorship if you would rather ask somebody else."
      />
    )
  }

  return (
    <div className="space-y-5">
      <div className="relative max-w-md">
        <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or what you want to learn…"
          className="pl-9"
        />
      </div>

      <div>
        <h3 className="pb-3 text-sm font-medium">
          Offering to mentor
          {matchingVolunteers.length > 0 && (
            <span className="pl-2 font-normal text-muted-foreground">
              {matchingVolunteers.length}
            </span>
          )}
        </h3>

        {matchingVolunteers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {q
              ? 'Nobody offering to mentor matches that.'
              : 'Nobody has offered to mentor yet. You can still ask anyone — search for them by name.'}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {matchingVolunteers.map((v) => {
              const person = one(v.employee as unknown) as MentorshipPerson | undefined
              const full = (v.slots_left ?? 0) <= 0
              const paused = !v.is_accepting
              return (
                <Card key={v.employee_id}>
                  <CardContent className="pt-5">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {person ? getInitials(person.first_name, person.last_name) : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{personName(person)}</p>
                        <p className="text-xs text-muted-foreground">
                          {(one(person?.designation as unknown) as { title?: string } | undefined)
                            ?.title || 'Role not recorded'}
                          {' · '}
                          {(one(person?.department as unknown) as { name?: string } | undefined)
                            ?.name || 'No department'}
                        </p>
                        {v.headline && <p className="pt-2 text-sm">{v.headline}</p>}
                        {(v.focus_areas ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {v.focus_areas.map((area) => (
                              <Badge key={area} variant="secondary" className="text-[10px]">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 pt-3">
                          <Badge variant="outline" className="text-[10px]">
                            {paused
                              ? 'Not taking anyone just now'
                              : full
                                ? 'Full'
                                : `${v.slots_left} place${v.slots_left === 1 ? '' : 's'} left`}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={full || paused || !myEmployeeId || !person}
                            onClick={() => person && setTarget(person)}
                          >
                            <UserPlus className="mr-1.5 h-3 w-3" /> Ask
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {otherPeople.length > 0 && (
        <div>
          <h3 className="pb-1 text-sm font-medium">Anyone else</h3>
          <p className="pb-3 text-xs text-muted-foreground">
            These people have not offered to mentor, but you can still ask them.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {otherPeople.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(e.first_name, e.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{e.first_name} {e.last_name}</p>
                    <p className="text-xs text-muted-foreground">{e.employee_code}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!myEmployeeId}
                  onClick={() =>
                    setTarget({
                      id: e.id,
                      first_name: e.first_name,
                      last_name: e.last_name,
                    })
                  }
                >
                  <UserPlus className="mr-1.5 h-3 w-3" /> Ask
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {target && (
        <RequestMentorDialog
          open
          onOpenChange={(open) => !open && setTarget(null)}
          mentor={target}
          myEmployeeId={myEmployeeId ?? ''}
        />
      )}
    </div>
  )
}
