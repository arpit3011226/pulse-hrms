/**
 * How healthy a leave balance is, and what colour to show it in.
 *
 * The rule, set by August: below half remaining is a warning, below a
 * quarter is a problem.
 *
 *   50% or more left   green    plenty
 *   25% to under 50%   amber    getting low
 *   under 25%          red      nearly gone
 *
 * Measured on what is LEFT, not on what has been used. The card's headline
 * is "N days available", so the bar should be the same thing: it shrinks and
 * reddens together. A bar that fills up as you spend would have to turn red
 * when it is nearly full, which asks the reader to hold two opposite ideas
 * at once.
 */

export type BalanceHealth = 'none' | 'low' | 'warning' | 'healthy'

export interface BalanceShape {
  /** Entitlement, including anything carried forward. */
  total: number
  used: number
  pending: number
}

export interface BalanceReading {
  available: number
  /** Share of the entitlement still free, 0–100. */
  availablePercent: number
  /** Share awaiting approval, 0–100. Not yours any more, not yet gone. */
  pendingPercent: number
  health: BalanceHealth
}

export function readBalance({ total, used, pending }: BalanceShape): BalanceReading {
  const entitlement = Math.max(0, total)
  const available = Math.max(0, entitlement - used - pending)

  // No entitlement at all — compensatory off before anybody has earned any,
  // for instance. Nothing is wrong, so this must not be shown as an alarm:
  // zero of zero is not "nearly gone", it is "not applicable".
  if (entitlement === 0) {
    return { available: 0, availablePercent: 0, pendingPercent: 0, health: 'none' }
  }

  const availablePercent = Math.min(100, Math.max(0, (available / entitlement) * 100))
  const pendingPercent = Math.min(
    100 - availablePercent,
    Math.max(0, (pending / entitlement) * 100)
  )

  const health: BalanceHealth =
    availablePercent < 25 ? 'low' : availablePercent < 50 ? 'warning' : 'healthy'

  return { available, availablePercent, pendingPercent, health }
}

/** Bar colour for each state. */
export const HEALTH_BAR: Record<BalanceHealth, string> = {
  healthy: 'bg-emerald-500',
  warning: 'bg-amber-500',
  low: 'bg-rose-500',
  none: 'bg-muted-foreground/25',
}

/** A short word for the state, for anybody not reading colour. */
export const HEALTH_LABEL: Record<BalanceHealth, string> = {
  healthy: '',
  warning: 'Running low',
  low: 'Almost none left',
  none: 'None allocated',
}
