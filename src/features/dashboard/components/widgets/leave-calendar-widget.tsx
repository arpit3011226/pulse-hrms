import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getInitials } from '@/lib/utils'
import { useLeaveCalendar } from '../../hooks/use-dashboard'
import type { CalendarLeaveItem } from '../../api/dashboard.api'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Local YYYY-MM-DD. toISOString() would shift the date in IST and land a day early. */
function key(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** The grid always starts on a Monday, so weekends sit together at the end. */
function buildGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - offset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function Person({ item, compact }: { item: CalendarLeaveItem; compact?: boolean }) {
  const [first, ...rest] = item.employee_name.split(' ')
  return (
    <div className="flex items-center gap-2">
      <Avatar className={compact ? 'h-5 w-5' : 'h-7 w-7'}>
        <AvatarImage src={item.avatar_url ?? undefined} />
        <AvatarFallback className="text-[9px]">
          {getInitials(first, rest.join(' '))}
        </AvatarFallback>
      </Avatar>
      {!compact && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.employee_name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {item.department_name ?? 'No team'}
            {item.is_half_day ? ' · half day' : ''}
          </p>
        </div>
      )}
      {!compact && item.leave_type_name && (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {item.leave_type_name}
        </Badge>
      )}
    </div>
  )
}

/**
 * Who is away this month, across the whole company.
 *
 * Open to everybody, because you cannot plan a week without it. What is NOT
 * open to everybody is why somebody is away — sick leave on a company notice
 * board tells people something about a colleague's health. The database
 * decides that (org_leave_calendar); this screen simply shows what it is
 * given, and the badge is absent rather than blanked when the viewer is not
 * entitled to it.
 */
export function LeaveCalendarWidget() {
  const [cursor, setCursor] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [picked, setPicked] = useState<string | null>(() => key(new Date()))

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const grid = useMemo(() => buildGrid(year, month), [year, month])

  // The grid spills into the neighbouring months, so fetch what it shows
  // rather than the calendar month — otherwise the first and last rows are
  // silently empty.
  const { data, isLoading } = useLeaveCalendar(key(grid[0]), key(grid[41]))

  /** One entry per day a person is away, so a date lookup is a map hit. */
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarLeaveItem[]>()
    for (const item of data ?? []) {
      const from = new Date(item.start_date + 'T00:00:00')
      const to = new Date(item.end_date + 'T00:00:00')
      for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const k = key(d)
        if (!map.has(k)) map.set(k, [])
        map.get(k)!.push(item)
      }
    }
    return map
  }, [data])

  const todayKey = key(new Date())
  const pickedList = picked ? byDay.get(picked) ?? [] : []

  const monthLabel = cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const pickedLabel = picked
    ? new Date(picked + 'T00:00:00').toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
    : ''

  function shift(by: number) {
    setCursor(new Date(year, month + by, 1))
    setPicked(null)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-rose-500" />
            Who's On Leave
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => shift(-1)} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[130px] text-center text-sm font-medium">{monthLabel}</span>
            <Button variant="ghost" size="sm" onClick={() => shift(1)} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="ml-1"
              onClick={() => {
                const n = new Date()
                setCursor(new Date(n.getFullYear(), n.getMonth(), 1))
                setPicked(key(n))
              }}
            >
              Today
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : (
          <>
            <div className="mb-1 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {grid.map((d) => {
                const k = key(d)
                const inMonth = d.getMonth() === month
                const people = byDay.get(k) ?? []
                const isToday = k === todayKey
                const isPicked = k === picked
                const weekend = d.getDay() === 0 || d.getDay() === 6

                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPicked(isPicked ? null : k)}
                    className={[
                      'flex min-h-[62px] flex-col items-start rounded-md border p-1.5 text-left transition-colors',
                      inMonth ? 'bg-white' : 'bg-muted/30',
                      weekend && inMonth ? 'bg-muted/20' : '',
                      isPicked ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/40',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px]',
                        isToday ? 'bg-primary font-semibold text-primary-foreground' : '',
                        inMonth ? 'text-foreground' : 'text-muted-foreground/60',
                      ].join(' ')}
                    >
                      {d.getDate()}
                    </span>

                    {people.length > 0 && (
                      <div className="flex w-full flex-wrap items-center gap-0.5">
                        {people.slice(0, 3).map((p) => (
                          <Avatar key={p.leave_id} className="h-5 w-5">
                            <AvatarImage src={p.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[8px]">
                              {getInitials(
                                p.employee_name.split(' ')[0],
                                p.employee_name.split(' ').slice(1).join(' ')
                              )}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {people.length > 3 && (
                          <span className="text-[10px] font-medium text-muted-foreground">
                            +{people.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 border-t pt-3">
              {!picked ? (
                <p className="py-2 text-center text-sm text-muted-foreground">
                  Pick a day to see who is away.
                </p>
              ) : pickedList.length === 0 ? (
                <p className="py-2 text-center text-sm text-muted-foreground">
                  Everybody is in on {pickedLabel}.
                </p>
              ) : (
                <>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {pickedLabel} · {pickedList.length} away
                  </p>
                  <div className="max-h-[180px] space-y-2 overflow-y-auto pr-1">
                    {pickedList.map((p) => (
                      <div key={p.leave_id} className="rounded-md border p-2">
                        <Person item={p} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
