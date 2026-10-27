import { describe, expect, it } from 'vitest'
import { readBalance } from './balance-health'

/**
 * The thresholds are a business rule August set, not a styling choice, so
 * they are pinned here rather than left to whoever next edits the card.
 */
describe('readBalance', () => {
  it('is healthy with plenty left', () => {
    // 9 of 12 — the casual leave case from the screenshot.
    const r = readBalance({ total: 12, used: 3, pending: 0 })
    expect(r.available).toBe(9)
    expect(r.availablePercent).toBe(75)
    expect(r.health).toBe('healthy')
  })

  it('is healthy at exactly half, because the rule says BELOW half', () => {
    const r = readBalance({ total: 12, used: 6, pending: 0 })
    expect(r.availablePercent).toBe(50)
    expect(r.health).toBe('healthy')
  })

  it('warns just under half', () => {
    const r = readBalance({ total: 12, used: 7, pending: 0 })
    expect(r.health).toBe('warning')
  })

  it('warns at exactly a quarter, because the rule says BELOW a quarter', () => {
    const r = readBalance({ total: 12, used: 9, pending: 0 })
    expect(r.availablePercent).toBe(25)
    expect(r.health).toBe('warning')
  })

  it('goes low just under a quarter', () => {
    const r = readBalance({ total: 12, used: 10, pending: 0 })
    expect(r.health).toBe('low')
  })

  it('counts pending against what is available to plan with', () => {
    // Nine free on paper, but three are awaiting approval.
    const r = readBalance({ total: 12, used: 3, pending: 3 })
    expect(r.available).toBe(6)
    expect(r.availablePercent).toBe(50)
    expect(r.pendingPercent).toBe(25)
  })

  it('never lets the two segments overflow the bar', () => {
    const r = readBalance({ total: 10, used: 0, pending: 10 })
    expect(r.availablePercent + r.pendingPercent).toBeLessThanOrEqual(100)
  })

  it('treats no entitlement as not applicable, not as an alarm', () => {
    // Compensatory off before any has been earned. Zero of zero is not
    // "nearly gone" — showing it red would cry wolf on every account.
    const r = readBalance({ total: 0, used: 0, pending: 0 })
    expect(r.health).toBe('none')
  })

  it('survives a balance that has gone negative somehow', () => {
    const r = readBalance({ total: 5, used: 8, pending: 0 })
    expect(r.available).toBe(0)
    expect(r.availablePercent).toBe(0)
    expect(r.health).toBe('low')
  })
})
