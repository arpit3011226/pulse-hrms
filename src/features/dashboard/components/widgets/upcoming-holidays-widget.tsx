import { Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useHolidays } from '@/features/leave/hooks/use-leave'

export function UpcomingHolidaysWidget() {
  const currentYear = new Date().getFullYear()
  const { data: holidays } = useHolidays(currentYear)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcoming = (holidays ?? [])
    .filter((h) => {
      const hDate = new Date(h.date)
      hDate.setHours(0, 0, 0, 0)
      return hDate >= today && h.is_active
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 6)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-amber-500" />
          Upcoming Holidays
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No upcoming holidays</p>
        ) : (
          <ScrollArea className="max-h-[240px]">
            <div className="space-y-3">
              {upcoming.map((h) => {
                const hDate = new Date(h.date)
                const diffDays = Math.ceil((hDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                const isToday = diffDays === 0
                const isTomorrow = diffDays === 1
                return (
                  <div key={h.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600">
                        <span className="text-xs font-medium leading-none">
                          {hDate.toLocaleDateString('en-IN', { month: 'short' })}
                        </span>
                        <span className="text-sm font-bold leading-none">{hDate.getDate()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{h.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {hDate.toLocaleDateString('en-IN', { weekday: 'long' })}
                        </p>
                      </div>
                    </div>
                    <Badge variant={isToday ? 'default' : 'secondary'} className="text-xs">
                      {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : `${diffDays}d`}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
