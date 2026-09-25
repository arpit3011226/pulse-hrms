import * as React from 'react'

/**
 * The date range a module is currently showing.
 *
 * Leave, attendance, recruitment and the helpdesk all pile up over the year,
 * and every tab was showing everything ever recorded. One range is chosen
 * beside the module title and every tab below it narrows together, rather than
 * each table growing a control of its own.
 *
 * The control and the provider live in components/shared/date-range-filter;
 * this file holds the parts that are not components, so that editing either one
 * during development does not force a full reload.
 */

export interface DateRange {
  /** yyyy-mm-dd, or null for open-ended. */
  from: string | null
  to: string | null
  preset: PresetKey
}

export type PresetKey =
  | 'all'
  | 'this_month'
  | 'last_month'
  | 'last_30'
  | 'last_90'
  | 'this_quarter'
  | 'this_fy'
  | 'last_fy'
  | 'custom'

export const PRESET_LABELS: Record<PresetKey, string> = {
  all: 'All time',
  this_month: 'This month',
  last_month: 'Last month',
  last_30: 'Last 30 days',
  last_90: 'Last 90 days',
  this_quarter: 'This quarter',
  this_fy: 'This financial year',
  last_fy: 'Last financial year',
  custom: 'Custom range',
}

/** Presets in the order they are offered. "Custom" is chosen by typing dates. */
export const PRESET_ORDER: PresetKey[] = [
  'all', 'this_month', 'last_month', 'last_30', 'last_90',
  'this_quarter', 'this_fy', 'last_fy',
]

export function isoDate(d: Date): string {
  // Local date, not UTC: toISOString() would shift an Indian date back a day.
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** April to March, so a date in January to March belongs to the year before. */
function financialYearStart(d: Date): number {
  return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1
}

export const ALL_TIME: DateRange = { preset: 'all', from: null, to: null }

export function rangeForPreset(preset: PresetKey, today = new Date()): DateRange {
  const y = today.getFullYear()
  const m = today.getMonth()

  switch (preset) {
    case 'this_month':
      return { preset, from: isoDate(new Date(y, m, 1)), to: isoDate(new Date(y, m + 1, 0)) }
    case 'last_month':
      return { preset, from: isoDate(new Date(y, m - 1, 1)), to: isoDate(new Date(y, m, 0)) }
    case 'last_30': {
      const from = new Date(today)
      from.setDate(from.getDate() - 29)
      return { preset, from: isoDate(from), to: isoDate(today) }
    }
    case 'last_90': {
      const from = new Date(today)
      from.setDate(from.getDate() - 89)
      return { preset, from: isoDate(from), to: isoDate(today) }
    }
    case 'this_quarter': {
      const qStart = Math.floor(m / 3) * 3
      return { preset, from: isoDate(new Date(y, qStart, 1)), to: isoDate(new Date(y, qStart + 3, 0)) }
    }
    case 'this_fy': {
      const start = financialYearStart(today)
      return { preset, from: isoDate(new Date(start, 3, 1)), to: isoDate(new Date(start + 1, 2, 31)) }
    }
    case 'last_fy': {
      const start = financialYearStart(today) - 1
      return { preset, from: isoDate(new Date(start, 3, 1)), to: isoDate(new Date(start + 1, 2, 31)) }
    }
    case 'all':
    case 'custom':
    default:
      return { preset, from: null, to: null }
  }
}

export interface DateRangeContextValue {
  range: DateRange
  setRange: (range: DateRange) => void
  /**
   * Is this date inside the chosen range?
   *
   * A row with no date at all is kept. Hiding a leave request because nobody
   * filled in a date would be a worse answer than showing it.
   */
  inRange: (value: string | Date | null | undefined) => boolean
  isFiltering: boolean
}

export const DateRangeContext = React.createContext<DateRangeContextValue | null>(null)

/**
 * The module's chosen range.
 *
 * Falls back to "all time" when there is no provider above, so a tab that is
 * also used outside its own module keeps working without one.
 */
export function useDateRange(): DateRangeContextValue {
  const ctx = React.useContext(DateRangeContext)
  const fallback = React.useMemo<DateRangeContextValue>(
    () => ({ range: ALL_TIME, setRange: () => {}, inRange: () => true, isFiltering: false }),
    []
  )
  return ctx ?? fallback
}

/**
 * Rows narrowed to the module's chosen range.
 *
 * `key` is the date column the filter should read — the start of a leave, the
 * day of an attendance record, the date a ticket was raised. Rows with nothing
 * in that column stay visible.
 */
export function useDateFiltered<T>(
  rows: readonly T[] | null | undefined,
  key: keyof T & string
): T[] {
  const { inRange } = useDateRange()
  return React.useMemo(
    () => (rows ?? []).filter((row) => inRange(row[key] as string | null | undefined)),
    [rows, key, inRange]
  )
}
