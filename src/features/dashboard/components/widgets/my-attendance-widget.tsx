import { Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useMyAttendanceSummary } from '../../hooks/use-dashboard'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const STATUS_CONFIG: Record<string, { bg: string; label: string }> = {
  present: { bg: 'bg-emerald-500', label: 'P' },
  absent: { bg: 'bg-red-500', label: 'A' },
  half_day: { bg: 'bg-amber-500', label: 'H' },
  on_leave: { bg: 'bg-blue-500', label: 'L' },
  weekend: { bg: 'bg-gray-300 dark:bg-gray-600', label: 'W' },
  holiday: { bg: 'bg-purple-500', label: 'H' },
}

interface MyAttendanceWidgetProps {
  employeeId: string | undefined
}

export function MyAttendanceWidget({ employeeId }: MyAttendanceWidgetProps) {
  const { data: days } = useMyAttendanceSummary(employeeId)

  const today = new Date().toISOString().split('T')[0]
  const totalHours = (days ?? []).reduce((sum, d) => sum + (d.work_hours ?? 0), 0)
  const presentDays = (days ?? []).filter((d) => d.status === 'present' || d.status === 'half_day').length

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-emerald-500" />
          This Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center gap-2">
          {(days ?? DAY_LABELS.map(() => ({ date: '', status: null, clock_in: null, clock_out: null, work_hours: null }))).map((day, i) => {
            const isFuture = day.date > today
            const config = day.status ? STATUS_CONFIG[day.status] : null
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{DAY_LABELS[i]}</span>
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold',
                    isFuture
                      ? 'border-2 border-dashed border-muted-foreground/30 text-muted-foreground/50'
                      : config
                        ? `${config.bg} text-white`
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {isFuture ? '-' : config?.label ?? '-'}
                </div>
                {day.work_hours != null && day.work_hours > 0 && (
                  <span className="text-[10px] text-muted-foreground">{day.work_hours.toFixed(1)}h</span>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <span>{presentDays} days present</span>
          <span className="text-muted-foreground/40">|</span>
          <span>{totalHours.toFixed(1)}h total</span>
        </div>
      </CardContent>
    </Card>
  )
}
