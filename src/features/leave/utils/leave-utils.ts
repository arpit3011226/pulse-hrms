import type { LeaveBalance, LeaveBlackoutPeriod } from '@/types/database.types'

/**
 * Calculate working days between two dates, excluding non-working days and holidays.
 * If isHalfDay is true, returns 0.5.
 */
export function calculateWorkingDays(
  startDate: string,
  endDate: string,
  workingDays: number[],
  holidayDates: string[],
  isHalfDay: boolean
): number {
  if (isHalfDay) return 0.5

  const start = new Date(startDate)
  const end = new Date(endDate)
  const holidaySet = new Set(holidayDates)
  let count = 0

  const current = new Date(start)
  while (current <= end) {
    const dayOfWeek = current.getDay()
    const dateStr = current.toISOString().split('T')[0]

    if (workingDays.includes(dayOfWeek) && !holidaySet.has(dateStr)) {
      count++
    }

    current.setDate(current.getDate() + 1)
  }

  return count
}

/**
 * Generate leave request day records for each working day in the range.
 */
export function generateLeaveRequestDays(
  startDate: string,
  endDate: string,
  workingDays: number[],
  holidayDates: string[],
  isHalfDay: boolean,
  halfDayPeriod: 'first_half' | 'second_half' | null
): { leave_date: string; day_type: 'full' | 'first_half' | 'second_half' }[] {
  if (isHalfDay) {
    return [{ leave_date: startDate, day_type: halfDayPeriod || 'first_half' }]
  }

  const start = new Date(startDate)
  const end = new Date(endDate)
  const holidaySet = new Set(holidayDates)
  const days: { leave_date: string; day_type: 'full' | 'first_half' | 'second_half' }[] = []

  const current = new Date(start)
  while (current <= end) {
    const dayOfWeek = current.getDay()
    const dateStr = current.toISOString().split('T')[0]

    if (workingDays.includes(dayOfWeek) && !holidaySet.has(dateStr)) {
      days.push({ leave_date: dateStr, day_type: 'full' })
    }

    current.setDate(current.getDate() + 1)
  }

  return days
}

/**
 * Get available balance from a leave balance record.
 */
export function getAvailableBalance(balance: LeaveBalance): number {
  return balance.total_days + balance.carried_forward_days - balance.used_days - balance.pending_days
}

/**
 * Check if a date range overlaps with any blackout periods.
 */
export function isInBlackoutPeriod(
  startDate: string,
  endDate: string,
  blackoutPeriods: LeaveBlackoutPeriod[],
  leaveTypeId?: string
): LeaveBlackoutPeriod | null {
  for (const period of blackoutPeriods) {
    if (!period.is_active) continue

    // Check if the leave type is applicable
    if (
      period.applicable_leave_type_ids &&
      period.applicable_leave_type_ids.length > 0 &&
      leaveTypeId &&
      !period.applicable_leave_type_ids.includes(leaveTypeId)
    ) {
      continue
    }

    // Check date overlap
    if (startDate <= period.end_date && endDate >= period.start_date) {
      return period
    }
  }

  return null
}

/**
 * Format a date range for display.
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }

  if (startDate === endDate) {
    return start.toLocaleDateString('en-IN', opts)
  }

  return `${start.toLocaleDateString('en-IN', opts)} - ${end.toLocaleDateString('en-IN', opts)}`
}
