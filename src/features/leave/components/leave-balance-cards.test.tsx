import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LeaveBalanceCards } from './leave-balance-cards'
import type { LeaveBalanceWithRelations } from '@/types/database.types'

/**
 * The complaint that prompted this: the bar appeared only where leave had
 * been used, so three of the four cards looked like a broken control rather
 * than a full balance.
 */

function balance(
  id: string,
  name: string,
  total: number,
  used: number,
  pending = 0
): LeaveBalanceWithRelations {
  return {
    id,
    total_days: total,
    used_days: used,
    pending_days: pending,
    carried_forward_days: 0,
    leave_type: { name, code: name.slice(0, 2).toUpperCase() },
  } as unknown as LeaveBalanceWithRelations
}

// The four from the screenshot.
const CARDS = [
  balance('1', 'Casual Leave', 12, 3),
  balance('2', 'Sick Leave', 8, 0),
  balance('3', 'Earned Leave', 18, 0),
  balance('4', 'Compensatory Off', 0, 0),
]

describe('LeaveBalanceCards', () => {
  const html = renderToStaticMarkup(<LeaveBalanceCards balances={CARDS} />)

  it('gives every leave type a bar, not only the ones with leave taken', () => {
    expect([...html.matchAll(/role="progressbar"/g)]).toHaveLength(4)
  })

  it('shows a full green bar where the balance is untouched', () => {
    expect(html).toContain('bg-emerald-500')
    expect(html).toContain('width:100%')
  })

  it('warns in amber below half', () => {
    const low = renderToStaticMarkup(
      <LeaveBalanceCards balances={[balance('5', 'Casual Leave', 12, 7)]} />
    )
    expect(low).toContain('bg-amber-500')
    expect(low).toContain('Running low')
  })

  it('warns in red below a quarter', () => {
    const low = renderToStaticMarkup(
      <LeaveBalanceCards balances={[balance('6', 'Casual Leave', 12, 10)]} />
    )
    expect(low).toContain('bg-rose-500')
    expect(low).toContain('Almost none left')
  })

  it('does not shout red at a leave type nobody has been given any of', () => {
    const none = renderToStaticMarkup(
      <LeaveBalanceCards balances={[balance('7', 'Compensatory Off', 0, 0)]} />
    )
    expect(none).not.toContain('bg-rose-500')
    expect(none).toContain('None allocated')
  })

  it('says it in words as well as colour', () => {
    const low = renderToStaticMarkup(
      <LeaveBalanceCards balances={[balance('8', 'Casual Leave', 12, 11)]} />
    )
    // Colour alone fails roughly one man in twelve.
    expect(low).toContain('Almost none left')
  })
})
