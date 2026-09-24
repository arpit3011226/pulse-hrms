import { useState, useEffect } from 'react'
import { Clock, LogIn, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { useCurrentEmployee, useTodayAttendance, useEmployeeShift, useClockIn, useClockOut } from '../hooks/use-attendance'
import { formatTime, formatWorkHours, calculateWorkHours, getTodayDateString } from '../utils/attendance-utils'
import { toast } from 'sonner'

/** "2h 35m" from a duration in milliseconds. Never negative. */
function formatElapsed(diffMs: number): string {
  const safe = Math.max(0, diffMs)
  const h = Math.floor(safe / 3600000)
  const m = Math.floor((safe % 3600000) / 60000)
  return `${h}h ${m}m`
}

export function ClockInOutCard() {
  const today = getTodayDateString()
  const { data: employee } = useCurrentEmployee()
  const { data: todayRecord, isLoading } = useTodayAttendance(employee?.id || '', today)
  const { data: roster } = useEmployeeShift(employee?.id || '', today)
  const doClockIn = useClockIn()
  const doClockOut = useClockOut()
  // A ticking clock in state, with the label derived from it during render.
  // Writing the label into state from the effect made the component set state on
  // every mount, which is what the cascading-render rule warns about.
  const [nowMs, setNowMs] = useState(() => Date.now())

  const shift = roster?.shift as { id: string; name: string; start_time: string; end_time: string } | null

  // Tick once a minute only while the clock is actually running.
  const isRunning = !!todayRecord?.clock_in && !todayRecord?.clock_out
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => setNowMs(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [isRunning])

  const elapsed = isRunning
    ? formatElapsed(nowMs - new Date(todayRecord!.clock_in!).getTime())
    : ''

  const handleClockIn = async () => {
    if (!employee) return
    try {
      await doClockIn.mutateAsync({
        employeeId: employee.id,
        today,
        shiftId: shift?.id,
      })
      toast.success('Clocked in successfully')
    } catch (err: unknown) {
      console.error('Clock-in error:', err)
      const msg = err instanceof Error ? err.message : 'Failed to clock in'
      toast.error(msg)
    }
  }

  const handleClockOut = async () => {
    if (!todayRecord?.id || !todayRecord.clock_in) return
    const workHours = calculateWorkHours(todayRecord.clock_in, new Date().toISOString())
    try {
      await doClockOut.mutateAsync({ id: todayRecord.id, workHours })
      toast.success('Clocked out successfully')
    } catch {
      toast.error('Failed to clock out')
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (!employee) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Clock className="h-8 w-8 opacity-50" />
            <p className="text-sm font-medium">No employee record linked to your account</p>
            <p className="text-xs">Contact your admin to link your profile to an employee record.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isClockedIn = !!todayRecord?.clock_in && !todayRecord?.clock_out
  const isClockedOut = !!todayRecord?.clock_in && !!todayRecord?.clock_out

  return (
    <Card>
      <CardContent className="py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>

            {shift && (
              <p className="text-sm">
                Shift: <span className="font-medium">{shift.name}</span>
                <span className="ml-2 text-muted-foreground">({shift.start_time} - {shift.end_time})</span>
              </p>
            )}

            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Clock In: </span>
                <span className="font-medium">{formatTime(todayRecord?.clock_in || null)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Clock Out: </span>
                <span className="font-medium">{formatTime(todayRecord?.clock_out || null)}</span>
              </div>
              {isClockedOut && todayRecord?.work_hours !== null && (
                <div>
                  <span className="text-muted-foreground">Total: </span>
                  <span className="font-medium">{formatWorkHours(todayRecord.work_hours)}</span>
                </div>
              )}
              {isClockedIn && elapsed && (
                <div>
                  <span className="text-muted-foreground">Elapsed: </span>
                  <span className="font-medium text-primary">{elapsed}</span>
                </div>
              )}
            </div>

            {todayRecord?.status && (
              <div className="flex items-center gap-2">
                <StatusBadge status={todayRecord.status} />
                {todayRecord.is_regularized && (
                  <span className="text-xs text-muted-foreground">(Regularized)</span>
                )}
              </div>
            )}
          </div>

          <div>
            {!todayRecord?.clock_in && (
              <Button onClick={handleClockIn} disabled={doClockIn.isPending} size="lg">
                <LogIn className="mr-2 h-4 w-4" /> Clock In
              </Button>
            )}
            {isClockedIn && (
              <Button onClick={handleClockOut} disabled={doClockOut.isPending} variant="outline" size="lg">
                <LogOut className="mr-2 h-4 w-4" /> Clock Out
              </Button>
            )}
            {isClockedOut && (
              <span className="text-sm font-medium text-green-600">Day Complete</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
