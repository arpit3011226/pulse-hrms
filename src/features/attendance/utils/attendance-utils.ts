/**
 * Calculate work hours between clock-in and clock-out timestamps.
 * Returns decimal hours (e.g., 8.5 for 8 hours 30 minutes).
 */
export function calculateWorkHours(clockIn: string, clockOut: string): number {
  const inTime = new Date(clockIn).getTime()
  const outTime = new Date(clockOut).getTime()
  const diffMs = outTime - inTime
  if (diffMs <= 0) return 0
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100
}

/**
 * Check if an employee arrived late based on shift start time and grace period.
 */
export function isLateArrival(
  clockIn: string,
  shiftStartTime: string,
  graceMinutes: number
): boolean {
  const clockInDate = new Date(clockIn)
  const [hours, minutes] = shiftStartTime.split(':').map(Number)

  const shiftStart = new Date(clockInDate)
  shiftStart.setHours(hours, minutes, 0, 0)

  const graceEnd = new Date(shiftStart.getTime() + graceMinutes * 60 * 1000)
  return clockInDate > graceEnd
}

/**
 * Format a timestamp to "HH:mm" in local time.
 */
export function formatTime(timestamp: string | null): string {
  if (!timestamp) return '--:--'
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

/**
 * Format decimal hours to "Xh Ym" display.
 */
export function formatWorkHours(hours: number | null): string {
  if (hours === null || hours === undefined) return '-'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0 && m === 0) return '-'
  if (m === 0) return `${h}h`
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

/**
 * Get today's date as YYYY-MM-DD string.
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Get a month's date range for filtering.
 */
export function getMonthDateRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}
