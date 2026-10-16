import { describe, expect, it } from 'vitest'
import {
  workingDaysInMonth,
  professionalTaxKarnataka,
  labourWelfareFund,
  calculateComponentAmount,
  calculateLopDeduction,
  calculateStatutoryDeductions,
  computeEmployeePayroll,
  withStatutoryComponents,
  generatePayslipNumber,
} from './payroll-utils'

/**
 * Payroll arithmetic.
 *
 * This is the only part of Pulse where being wrong costs real money, and it
 * had no tests at all. These check the figures against the Indian statutory
 * rules the code says it implements: PF at 12% of basic capped at a basic of
 * 15,000, ESI at 0.75% and 3.25% of gross while gross is 21,000 or less, and
 * professional tax as a flat amount.
 *
 * Where a test records behaviour that looks wrong rather than behaviour that
 * is right, it says so and points at the defect.
 */

/** A component as computeEmployeePayroll expects it. */
function component(over: Partial<Parameters<typeof computeEmployeePayroll>[1][number]> = {}) {
  return {
    salary_component_id: 'id-' + (over.component_code ?? 'x'),
    component_code: 'BASIC',
    component_type: 'earning',
    calculation_type: 'flat',
    monthly_amount: 0,
    is_statutory: false,
    statutory_type: null,
    ...over,
  }
}

describe('calculateComponentAmount', () => {
  it('takes a percentage of basic', () => {
    expect(calculateComponentAmount('percentage_of_basic', 40, 50_000, 100_000)).toBe(20_000)
  })

  it('takes a percentage of gross', () => {
    expect(calculateComponentAmount('percentage_of_gross', 10, 50_000, 100_000)).toBe(10_000)
  })

  it('passes a flat amount through untouched', () => {
    expect(calculateComponentAmount('flat', 1_250, 50_000, 100_000)).toBe(1_250)
  })

  it('rounds to the rupee rather than carrying paise', () => {
    // 33.33% of 50,000 is 16,665.00 exactly; 33.333% is 16,666.5 → 16,667
    expect(calculateComponentAmount('percentage_of_basic', 33.333, 50_000, 0)).toBe(16_667)
  })

  it('treats an unknown calculation type as flat', () => {
    expect(calculateComponentAmount('something_else', 999, 50_000, 100_000)).toBe(999)
  })
})

describe('calculateStatutoryDeductions', () => {
  it('takes PF at 12% of basic', () => {
    const { pfEmployee, pfEmployer } = calculateStatutoryDeductions(10_000, 25_000)
    expect(pfEmployee).toBe(1_200)
    expect(pfEmployer).toBe(1_200)
  })

  it('caps PF at a basic of 15,000, so 1,800 is the most', () => {
    const { pfEmployee } = calculateStatutoryDeductions(90_000, 300_000)
    expect(pfEmployee).toBe(1_800)
  })

  it('charges ESI while gross is 21,000 or under', () => {
    const { esiEmployee, esiEmployer } = calculateStatutoryDeductions(8_000, 20_000)
    expect(esiEmployee).toBe(150) // 0.75%
    expect(esiEmployer).toBe(650) // 3.25%
  })

  it('charges ESI exactly at the 21,000 boundary', () => {
    const { esiEmployee } = calculateStatutoryDeductions(8_000, 21_000)
    expect(esiEmployee).toBe(158) // 157.5 rounds up
  })

  it('stops ESI one rupee above the limit', () => {
    const { esiEmployee, esiEmployer } = calculateStatutoryDeductions(8_000, 21_001)
    expect(esiEmployee).toBe(0)
    expect(esiEmployer).toBe(0)
  })

  it('applies the Karnataka professional tax threshold', () => {
    expect(calculateStatutoryDeductions(5_000, 8_000).pt).toBe(0)
    expect(calculateStatutoryDeductions(90_000, 300_000).pt).toBe(200)
  })

  it('charges labour welfare fund only in December', () => {
    expect(calculateStatutoryDeductions(20_000, 50_000, 12).lwf).toBe(150)
    expect(calculateStatutoryDeductions(20_000, 50_000, 11).lwf).toBe(0)
    expect(calculateStatutoryDeductions(20_000, 50_000).lwf).toBe(0)
  })
})

describe('workingDaysInMonth', () => {
  it('counts weekdays, excluding Saturdays and Sundays', () => {
    // October 2026: 31 days, starts on a Thursday → 22 weekdays
    expect(workingDaysInMonth(2026, 10)).toBe(22)
    // February 2026: 28 days, starts on a Sunday → 20 weekdays
    expect(workingDaysInMonth(2026, 2)).toBe(20)
  })

  it('handles a leap February', () => {
    // February 2028 has 29 days, starting on a Tuesday → 21 weekdays
    expect(workingDaysInMonth(2028, 2)).toBe(21)
  })

  it('never returns the hardcoded 22 for every month', () => {
    const counts = new Set(
      Array.from({ length: 12 }, (_, i) => workingDaysInMonth(2026, i + 1))
    )
    // The old code assumed 22 all year. A real year has a spread.
    expect(counts.size).toBeGreaterThan(1)
    for (const n of counts) {
      expect(n).toBeGreaterThanOrEqual(20)
      expect(n).toBeLessThanOrEqual(23)
    }
  })
})

describe('professionalTaxKarnataka', () => {
  it('charges nothing below the exemption limit', () => {
    expect(professionalTaxKarnataka(24_999)).toBe(0)
    expect(professionalTaxKarnataka(10_000)).toBe(0)
  })

  it('charges 200 at and above the limit', () => {
    expect(professionalTaxKarnataka(25_000)).toBe(200)
    expect(professionalTaxKarnataka(300_000)).toBe(200)
  })
})

describe('labourWelfareFund', () => {
  it('is taken once a year, in December', () => {
    expect(labourWelfareFund(12)).toBe(150)
  })

  it('is nil in every other month', () => {
    for (const m of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
      expect(labourWelfareFund(m)).toBe(0)
    }
  })

  it('is nil when the month is unknown', () => {
    expect(labourWelfareFund(null)).toBe(0)
    expect(labourWelfareFund(undefined)).toBe(0)
  })
})

describe('calculateLopDeduction', () => {
  it('deducts a day of gross per day of loss of pay', () => {
    expect(calculateLopDeduction(44_000, 22, 1)).toBe(2_000)
    expect(calculateLopDeduction(44_000, 22, 3)).toBe(6_000)
  })

  it('deducts nothing when there is no loss of pay', () => {
    expect(calculateLopDeduction(44_000, 22, 0)).toBe(0)
  })

  it('refuses to divide by zero working days', () => {
    expect(calculateLopDeduction(44_000, 0, 2)).toBe(0)
  })

  it('does not pay somebody for negative loss of pay', () => {
    expect(calculateLopDeduction(44_000, 22, -5)).toBe(0)
  })
})

describe('computeEmployeePayroll', () => {
  const standardSet = [
    component({ component_code: 'BASIC', monthly_amount: 20_000 }),
    component({ component_code: 'HRA', monthly_amount: 8_000 }),
    component({ component_code: 'SA', monthly_amount: 2_000 }),
    component({
      component_code: 'PF',
      component_type: 'deduction',
      is_statutory: true,
      statutory_type: 'pf_employee',
      monthly_amount: 0,
    }),
    component({
      component_code: 'PT',
      component_type: 'deduction',
      is_statutory: true,
      statutory_type: 'pt',
      monthly_amount: 0,
    }),
    component({
      component_code: 'PFER',
      component_type: 'employer_contribution',
      is_statutory: true,
      statutory_type: 'pf_employer',
      monthly_amount: 0,
    }),
  ]

  it('adds the earnings and takes off the deductions', () => {
    const r = computeEmployeePayroll(30_000, standardSet, [], 22, 0, 22)
    expect(r.grossEarnings).toBe(30_000)   // 20,000 + 8,000 + 2,000
    // PF is 12% of a basic capped at 15,000, so 1,800 — not 12% of the actual
    // 20,000 basic. That cap is the statutory minimum and is applied always.
    expect(r.totalDeductions).toBe(2_000)  // PF 1,800 + PT 200
    expect(r.netPay).toBe(28_000)
  })

  it('keeps the employer contribution out of net pay', () => {
    const r = computeEmployeePayroll(30_000, standardSet, [], 22, 0, 22)
    expect(r.totalEmployerContributions).toBe(1_800)
    expect(r.netPay).toBe(r.grossEarnings - r.totalDeductions)
  })

  it('reduces earnings proportionally for loss of pay', () => {
    const r = computeEmployeePayroll(30_000, standardSet, [], 22, 2, 22)
    // Each earning scaled by 20/22
    expect(r.earnings.find((e) => e.component_code === 'BASIC')?.amount).toBe(18_182)
    expect(r.grossEarnings).toBeLessThan(30_000)
  })

  it('adds an addition adjustment to earnings', () => {
    const r = computeEmployeePayroll(
      30_000, standardSet,
      [{ adjustment_type: 'addition', amount: 5_000, salary_component_id: null }],
      22, 0, 22
    )
    expect(r.grossEarnings).toBe(35_000)
    expect(r.netPay).toBe(33_000)
  })

  it('takes a deduction adjustment off net pay', () => {
    const r = computeEmployeePayroll(
      30_000, standardSet,
      [{ adjustment_type: 'deduction', amount: 1_000, salary_component_id: null }],
      22, 0, 22
    )
    expect(r.totalDeductions).toBe(3_000)  // PF 1,800 + PT 200 + adjustment 1,000
    expect(r.netPay).toBe(27_000)
  })

  it('charges ESI for a low earner and not for a high one', () => {
    const esi = component({
      component_code: 'ESI',
      component_type: 'deduction',
      is_statutory: true,
      statutory_type: 'esi_employee',
      monthly_amount: 0,
    })
    const low = computeEmployeePayroll(
      18_000,
      [component({ component_code: 'BASIC', monthly_amount: 18_000 }), esi],
      [], 22, 0, 22
    )
    expect(low.deductions.find((d) => d.component_code === 'ESI')?.amount).toBe(135)

    const high = computeEmployeePayroll(
      60_000,
      [component({ component_code: 'BASIC', monthly_amount: 60_000 }), esi],
      [], 22, 0, 22
    )
    // Above the limit the line is dropped rather than shown as zero.
    expect(high.deductions.find((d) => d.component_code === 'ESI')).toBeUndefined()
  })

  it('falls back to 40% of gross as basic when there is no BASIC component', () => {
    const r = computeEmployeePayroll(
      50_000,
      [
        component({ component_code: 'ALLOWANCE', monthly_amount: 50_000 }),
        component({
          component_code: 'PF', component_type: 'deduction',
          is_statutory: true, statutory_type: 'pf_employee', monthly_amount: 0,
        }),
      ],
      [], 22, 0, 22
    )
    // 40% of 50,000 = 20,000 basic, capped at 15,000 → PF 1,800
    expect(r.deductions.find((d) => d.component_code === 'PF')?.amount).toBe(1_800)
  })

  it('computes nothing when there are no components — the caller must not let this happen', () => {
    const r = computeEmployeePayroll(100_000, [], [], 22, 0, 22)
    // Correct in isolation: no components means nothing to add up. The danger
    // was upstream — computePayrollForRun used to run somebody through anyway
    // and produce a payslip for zero while reporting success. QA-16: it now
    // sets those people aside and names them instead.
    expect(r.grossEarnings).toBe(0)
    expect(r.netPay).toBe(0)
  })
})

describe('computeEmployeePayroll — Karnataka statutory rules', () => {
  const withLwf = [
    component({ component_code: 'BASIC', monthly_amount: 30_000 }),
    component({
      component_code: 'LWF', component_type: 'deduction',
      is_statutory: true, statutory_type: 'lwf', monthly_amount: 0,
    }),
  ]

  it('deducts the labour welfare fund in December', () => {
    const dec = computeEmployeePayroll(30_000, withLwf, [], 22, 0, 22, 12)
    expect(dec.deductions.find((d) => d.component_code === 'LWF')?.amount).toBe(150)
  })

  it('does not deduct it in any other month', () => {
    const nov = computeEmployeePayroll(30_000, withLwf, [], 22, 0, 22, 11)
    expect(nov.deductions.find((d) => d.component_code === 'LWF')).toBeUndefined()
  })

  it('exempts a low earner from professional tax', () => {
    const pt = component({
      component_code: 'PT', component_type: 'deduction',
      is_statutory: true, statutory_type: 'pt', monthly_amount: 0,
    })
    const low = computeEmployeePayroll(
      20_000, [component({ component_code: 'BASIC', monthly_amount: 20_000 }), pt], [], 22, 0, 22, 6
    )
    expect(low.deductions.find((d) => d.component_code === 'PT')).toBeUndefined()

    const high = computeEmployeePayroll(
      50_000, [component({ component_code: 'BASIC', monthly_amount: 50_000 }), pt], [], 22, 0, 22, 6
    )
    expect(high.deductions.find((d) => d.component_code === 'PT')?.amount).toBe(200)
  })
})

/**
 * QA-23. A statutory deduction that only happens when somebody remembered to
 * tick it is not a statutory deduction. The first December run proved it:
 * ten of eleven employees were paid with no provident fund and no
 * professional tax, and the labour welfare fund was taken from nobody.
 */
describe('withStatutoryComponents', () => {
  const orgStatutory = [
    component({ component_code: 'PF_EMP', component_type: 'deduction', is_statutory: true, statutory_type: 'pf_employee' }),
    component({ component_code: 'PF_ER', component_type: 'employer_contribution', is_statutory: true, statutory_type: 'pf_employer' }),
    component({ component_code: 'PT', component_type: 'deduction', is_statutory: true, statutory_type: 'pt' }),
    component({ component_code: 'LWF', component_type: 'deduction', is_statutory: true, statutory_type: 'lwf', monthly_amount: 150 }),
    component({ component_code: 'TDS', component_type: 'deduction', is_statutory: true, statutory_type: 'tds', monthly_amount: 5_000 }),
  ]

  it('adds the statutory lines an employee is missing', () => {
    const attached = [component({ component_code: 'BASIC', monthly_amount: 40_000 })]
    const merged = withStatutoryComponents(attached, orgStatutory)
    const types = merged.map((c) => c.statutory_type).filter(Boolean)
    expect(types).toContain('pf_employee')
    expect(types).toContain('pt')
    expect(types).toContain('lwf')
  })

  it('never adds TDS, which is declared by the employee and typed in', () => {
    const merged = withStatutoryComponents([], orgStatutory)
    expect(merged.map((c) => c.statutory_type)).not.toContain('tds')
  })

  it('leaves a component the employee already carries exactly as it is', () => {
    const mine = component({
      component_code: 'PF_EMP', component_type: 'deduction',
      is_statutory: true, statutory_type: 'pf_employee', monthly_amount: 999,
    })
    const merged = withStatutoryComponents([mine], orgStatutory)
    const pf = merged.filter((c) => c.statutory_type === 'pf_employee')
    expect(pf).toHaveLength(1)
    expect(pf[0].monthly_amount).toBe(999)
  })

  it('adds nothing when the organisation has no statutory components', () => {
    const attached = [component({ component_code: 'BASIC', monthly_amount: 40_000 })]
    expect(withStatutoryComponents(attached, [])).toHaveLength(1)
  })
})

describe('computeEmployeePayroll — statutory deductions are not optional', () => {
  const orgStatutory = [
    component({ component_code: 'PF_EMP', component_type: 'deduction', is_statutory: true, statutory_type: 'pf_employee' }),
    component({ component_code: 'PT', component_type: 'deduction', is_statutory: true, statutory_type: 'pt' }),
    component({ component_code: 'LWF', component_type: 'deduction', is_statutory: true, statutory_type: 'lwf', monthly_amount: 150 }),
  ]

  // Exactly the demo employees who came out of the December run untouched:
  // earnings only, no statutory lines attached at all.
  const earningsOnly = [
    component({ component_code: 'BASIC', monthly_amount: 40_000 }),
    component({ component_code: 'HRA', monthly_amount: 20_000 }),
    component({ component_code: 'DA', monthly_amount: 4_000 }),
  ]

  it('deducts PF and professional tax from somebody who carries neither', () => {
    const r = computeEmployeePayroll(64_000, earningsOnly, [], 23, 0, 23, 11, orgStatutory)
    expect(r.grossEarnings).toBe(64_000)
    expect(r.totalDeductions).toBe(2_000)  // PF 1,800 + PT 200, no LWF in November
    expect(r.netPay).toBe(62_000)
  })

  it('takes the Karnataka labour welfare fund in December', () => {
    const r = computeEmployeePayroll(64_000, earningsOnly, [], 23, 0, 23, 12, orgStatutory)
    expect(r.totalDeductions).toBe(2_150)  // PF 1,800 + PT 200 + LWF 150
    expect(r.netPay).toBe(61_850)
  })

  it('still pays nothing extra when the employee already has the components', () => {
    const withPf = [
      ...earningsOnly,
      component({ component_code: 'PF_EMP', component_type: 'deduction', is_statutory: true, statutory_type: 'pf_employee' }),
      component({ component_code: 'PT', component_type: 'deduction', is_statutory: true, statutory_type: 'pt' }),
    ]
    const r = computeEmployeePayroll(64_000, withPf, [], 23, 0, 23, 12, orgStatutory)
    // One PF line and one PT line, not two of each.
    expect(r.deductions.filter((d) => d.component_code === 'PF_EMP')).toHaveLength(1)
    expect(r.totalDeductions).toBe(2_150)
  })

  it('charges no professional tax below the Karnataka threshold', () => {
    const small = [component({ component_code: 'BASIC', monthly_amount: 20_000 })]
    const r = computeEmployeePayroll(20_000, small, [], 23, 0, 23, 11, orgStatutory)
    // PF 1,800 on the capped basic, ESI is not in this org's list, PT nil.
    expect(r.deductions.find((d) => d.component_code === 'PT')).toBeUndefined()
    expect(r.totalDeductions).toBe(1_800)
  })
})

describe('generatePayslipNumber', () => {
  it('pads the month and the sequence', () => {
    expect(generatePayslipNumber(3, 2026, 7)).toBe('PS-202603-0007')
    expect(generatePayslipNumber(12, 2026, 1234)).toBe('PS-202612-1234')
  })
})
