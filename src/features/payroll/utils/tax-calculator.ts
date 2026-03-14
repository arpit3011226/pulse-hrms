/**
 * Indian Income Tax Calculator for FY 2025-26
 * Supports both Old and New tax regimes, surcharge, cess, and contractor TDS.
 */

import type { TaxRegime } from '@/types/database.types'

// ---------------------------------------------------------------------------
// Slab definitions
// ---------------------------------------------------------------------------

interface TaxSlab {
  from: number
  to: number // Infinity for the last slab
  rate: number // percentage
}

const NEW_REGIME_SLABS: TaxSlab[] = [
  { from: 0, to: 400000, rate: 0 },
  { from: 400000, to: 800000, rate: 5 },
  { from: 800000, to: 1200000, rate: 10 },
  { from: 1200000, to: 1600000, rate: 15 },
  { from: 1600000, to: 2000000, rate: 20 },
  { from: 2000000, to: 2400000, rate: 25 },
  { from: 2400000, to: Infinity, rate: 30 },
]

const OLD_REGIME_SLABS: TaxSlab[] = [
  { from: 0, to: 250000, rate: 0 },
  { from: 250000, to: 500000, rate: 5 },
  { from: 500000, to: 1000000, rate: 20 },
  { from: 1000000, to: Infinity, rate: 30 },
]

const NEW_REGIME_STANDARD_DEDUCTION = 75000
const OLD_REGIME_STANDARD_DEDUCTION = 50000

// Rebate u/s 87A thresholds
const NEW_REGIME_REBATE_LIMIT = 1275000 // up to 12.75L taxable income => zero tax
const OLD_REGIME_REBATE_LIMIT = 500000 // up to 5L taxable income => zero tax

// Surcharge slabs (apply on tax amount, before cess)
interface SurchargeSlab {
  from: number
  to: number
  rate: number // percentage
}

const SURCHARGE_SLABS: SurchargeSlab[] = [
  { from: 5000000, to: 10000000, rate: 10 },
  { from: 10000000, to: 20000000, rate: 15 },
  { from: 20000000, to: 50000000, rate: 25 },
  { from: 50000000, to: Infinity, rate: 37 },
]

const CESS_RATE = 4 // 4% Health & Education Cess

// ---------------------------------------------------------------------------
// Exemption caps (Old regime only)
// ---------------------------------------------------------------------------

export const EXEMPTION_LIMITS = {
  section_80c: 150000,
  section_80d: 50000, // higher limit for senior citizens; default 25K for self
  home_loan_interest: 200000,
  nps_contribution: 50000, // 80CCD(1B)
} as const

// ---------------------------------------------------------------------------
// Tax computation helpers
// ---------------------------------------------------------------------------

function computeSlabTax(taxableIncome: number, slabs: TaxSlab[]): number {
  let tax = 0
  for (const slab of slabs) {
    if (taxableIncome <= slab.from) break
    const slabIncome = Math.min(taxableIncome, slab.to) - slab.from
    tax += (slabIncome * slab.rate) / 100
  }
  return Math.round(tax)
}

function computeSurcharge(totalIncome: number, tax: number): number {
  for (let i = SURCHARGE_SLABS.length - 1; i >= 0; i--) {
    const slab = SURCHARGE_SLABS[i]
    if (totalIncome > slab.from) {
      return Math.round((tax * slab.rate) / 100)
    }
  }
  return 0
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

export interface TaxBreakdown {
  grossIncome: number
  standardDeduction: number
  totalExemptions: number
  taxableIncome: number
  slabTax: number
  rebate87A: number
  taxAfterRebate: number
  surcharge: number
  cess: number
  totalTax: number
}

export interface Exemptions {
  section_80c?: number
  section_80d?: number
  home_loan_interest?: number
  hra_claimed?: number
  nps_contribution?: number
  other_deductions?: number
}

/**
 * Calculate annual tax for a given income under the specified regime.
 * In the New regime, exemptions are ignored (except standard deduction).
 */
export function calculateAnnualTax(
  annualIncome: number,
  regime: TaxRegime,
  exemptions: Exemptions = {}
): TaxBreakdown {
  const standardDeduction =
    regime === 'new' ? NEW_REGIME_STANDARD_DEDUCTION : OLD_REGIME_STANDARD_DEDUCTION

  // Compute total exemptions (only for old regime)
  let totalExemptions = 0
  if (regime === 'old') {
    const s80c = Math.min(exemptions.section_80c ?? 0, EXEMPTION_LIMITS.section_80c)
    const s80d = Math.min(exemptions.section_80d ?? 0, EXEMPTION_LIMITS.section_80d)
    const homeLoan = Math.min(
      exemptions.home_loan_interest ?? 0,
      EXEMPTION_LIMITS.home_loan_interest
    )
    const hra = exemptions.hra_claimed ?? 0
    const nps = Math.min(exemptions.nps_contribution ?? 0, EXEMPTION_LIMITS.nps_contribution)
    const other = exemptions.other_deductions ?? 0
    totalExemptions = s80c + s80d + homeLoan + hra + nps + other
  }

  const taxableIncome = Math.max(0, annualIncome - standardDeduction - totalExemptions)

  const slabs = regime === 'new' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS
  const slabTax = computeSlabTax(taxableIncome, slabs)

  // Rebate u/s 87A
  const rebateLimit = regime === 'new' ? NEW_REGIME_REBATE_LIMIT : OLD_REGIME_REBATE_LIMIT
  const rebate87A = taxableIncome <= rebateLimit ? slabTax : 0
  const taxAfterRebate = slabTax - rebate87A

  // Surcharge
  const surcharge = taxAfterRebate > 0 ? computeSurcharge(annualIncome, taxAfterRebate) : 0

  // Cess
  const cess = Math.round(((taxAfterRebate + surcharge) * CESS_RATE) / 100)

  const totalTax = taxAfterRebate + surcharge + cess

  return {
    grossIncome: annualIncome,
    standardDeduction,
    totalExemptions,
    taxableIncome,
    slabTax,
    rebate87A,
    taxAfterRebate,
    surcharge,
    cess,
    totalTax,
  }
}

/**
 * Calculate monthly TDS for a salaried employee.
 * Spreads the remaining annual liability evenly over remaining months.
 * @param monthsRemaining - months left in the financial year (1-12)
 * @param tdsPaidSoFar - TDS already deducted in prior months of the FY
 */
export function calculateMonthlyTds(
  annualIncome: number,
  regime: TaxRegime,
  exemptions: Exemptions = {},
  monthsRemaining: number = 12,
  tdsPaidSoFar: number = 0
): number {
  const { totalTax } = calculateAnnualTax(annualIncome, regime, exemptions)
  const remainingTax = Math.max(0, totalTax - tdsPaidSoFar)
  const effectiveMonths = Math.max(1, monthsRemaining)
  return Math.round(remainingTax / effectiveMonths)
}

/**
 * Get contractor TDS amount for a given invoice/payment amount.
 * Section 194C: 1% (individuals/HUF), 2% (others) on contract payments.
 * Section 194J: 10% for professional/technical services.
 */
export function getContractorTds(
  amount: number,
  section: '194C' | '194J',
  isIndividualOrHuf: boolean = true
): { tdsAmount: number; tdsRate: number } {
  let tdsRate: number
  if (section === '194J') {
    tdsRate = 10
  } else {
    // 194C
    tdsRate = isIndividualOrHuf ? 1 : 2
  }
  return {
    tdsAmount: Math.round((amount * tdsRate) / 100),
    tdsRate,
  }
}

/**
 * Compare tax under both regimes for a given income and exemptions.
 */
export function compareRegimes(annualIncome: number, exemptions: Exemptions = {}) {
  const oldRegime = calculateAnnualTax(annualIncome, 'old', exemptions)
  const newRegime = calculateAnnualTax(annualIncome, 'new') // no exemptions in new
  return {
    old: oldRegime,
    new: newRegime,
    recommended: newRegime.totalTax <= oldRegime.totalTax ? ('new' as TaxRegime) : ('old' as TaxRegime),
    savings: Math.abs(oldRegime.totalTax - newRegime.totalTax),
  }
}

/**
 * Helper: Get current Indian financial year string.
 * Indian FY runs Apr to Mar. E.g. for date in Jan 2026 → '2025-26'
 */
export function getCurrentFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth() // 0-indexed
  const year = date.getFullYear()
  if (month >= 3) {
    // Apr onwards
    return `${year}-${String(year + 1).slice(2)}`
  }
  return `${year - 1}-${String(year).slice(2)}`
}

/**
 * Get list of financial year options for selection (current + 2 previous).
 */
export function getFinancialYearOptions(): string[] {
  const current = getCurrentFinancialYear()
  const currentStartYear = parseInt(current.split('-')[0])
  return [
    `${currentStartYear - 2}-${String(currentStartYear - 1).slice(2)}`,
    `${currentStartYear - 1}-${String(currentStartYear).slice(2)}`,
    current,
  ]
}
