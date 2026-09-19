import { Clock, MapPin } from 'lucide-react'
import { useTodayAttendance, useEmployeeShift } from '@/features/attendance/hooks/use-attendance'
import { getTodayDateString, formatTime, isLateArrival, formatWorkHours } from '@/features/attendance/utils/attendance-utils'

interface HubAttendancePanelProps {
  employeeId: string
}

export function HubAttendancePanel({ employeeId }: HubAttendancePanelProps) {
  const today = getTodayDateString()
  const { data: todayRecord, isLoading } = useTodayAttendance(employeeId, today)
  const { data: shift } = useEmployeeShift(employeeId, today)

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SectionHeader icon={Clock} title="Ongoing Management" />
        <div className="animate-pulse rounded-lg border bg-muted/30 p-6 h-20" />
      </div>
    )
  }

  const hasCheckedIn = todayRecord?.clock_in
  const hasCheckedOut = todayRecord?.clock_out
  const shiftData = shift?.[0] as { start_time?: string; grace_period_minutes?: number; name?: string } | undefined
  const late = hasCheckedIn && shiftData?.start_time
    ? isLateArrival(todayRecord.clock_in!, shiftData.start_time, shiftData.grace_period_minutes ?? 15)
    : false

  const clockInTime = hasCheckedIn
    ? new Date(todayRecord.clock_in!).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()
    : null

  return (
    <div className="space-y-3">
      <SectionHeader icon={Clock} title="Ongoing Management" />

      {/* Attendance card */}
      <div className="rounded-lg border bg-white p-4">
        {hasCheckedIn ? (
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`mt-1 h-2.5 w-2.5 rounded-full ${late ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <div>
                <p className="font-semibold text-foreground">
                  Checked in {clockInTime}
                </p>
                <p className="text-xs text-muted-foreground">
                  Today
                  {shiftData?.grace_period_minutes && ` · Grace: ${shiftData.grace_period_minutes} min`}
                </p>
                {hasCheckedOut && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Checked out {formatTime(todayRecord.clock_out)} · {formatWorkHours(todayRecord.work_hours)}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                late
                  ? 'bg-amber-50 text-amber-600 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              }`}>
                {late ? 'Late' : 'On Time'}
              </span>
              {shiftData?.name && (
                <p className="mt-1.5 flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {shiftData.name}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <div>
              <p className="text-sm text-muted-foreground">No check-in recorded today</p>
              {shiftData?.start_time && (
                <p className="text-xs text-muted-foreground/60">
                  Shift starts at {shiftData.start_time}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="font-semibold text-foreground">{title}</h3>
    </div>
  )
}
