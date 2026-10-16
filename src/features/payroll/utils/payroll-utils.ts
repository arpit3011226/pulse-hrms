import {
  KARNATAKA_PT_EXEMPTION_LIMIT,
  KARNATAKA_PT_MONTHLY,
  KARNATAKA_LWF_ANNUAL,
  INDIA_PF_RATE,
  INDIA_ESI_EMPLOYEE_RATE,
  INDIA_ESI_EMPLOYER_RATE,
  INDIA_ESI_GROSS_LIMIT,
  INDIA_PF_BASIC_LIMIT,
  PF_EXEMPT_EMPLOYMENT_TYPES,
  CONTRACTOR_EMPLOYMENT_TYPES,
  CONTRACTOR_TDS_RATE,
} from '@/lib/constants'

export function calculateComponentAmount(
  calculationType: string,
  value: number,
  basicAmount: number,
  grossAmount: number
): number {
  switch (calculationType) {
    case 'percentage_of_basic':
      return Math.round((basicAmount * value) / 100)
    case 'percentage_of_gross':
      return Math.round((grossAmount * value) / 100)
    case 'flat':
    default:
      return value
  }
}

/**
 * Working days in a month: every day that is not a Saturday or a Sunday.
 *
 * This is the denominator for a day's pay, so a day of unpaid leave costs the
 * same whether the month is long or short. It used to be hardcoded to 22,
 * which is right for roughly no month at all — a 2026 month ranges from 20 to
 * 23 working days.
 *
 * Declared holidays are NOT excluded. A public holiday is a paid day off, so
 * taking it out of the denominator would quietly raise the cost of every day
 * of unpaid leave in that month.
 *
 * `month` is 1-12, as it is stored on the payroll cycle.
 */
export function workingDaysInMonth(year: number, month: number): number {
  const days = new Date(year, month, 0).getDate()
  let count = 0
  for (let d = 1; d <= days; d++) {
    const weekday = new Date(year, month - 1, d).getDay()
    if (weekday !== 0 && weekday !== 6) count++
  }
  return count
}

/**
 * Professional tax, Karnataka.
 *
 * A state levy with a threshold, not a flat charge. Karnataka exempts monthly
 * salary below 25,000 and charges 200 at or above it.
 *
 * Thresholds move with state budgets. If August takes on people outside
 * Karnataka this needs a per-state table, and the figure should be confirmed
 * against the current notification rather than trusted here indefinitely.
 */
export function professionalTaxKarnataka(grossMonthly: number): number {
  return grossMonthly >= KARNATAKA_PT_EXEMPTION_LIMIT ? KARNATAKA_PT_MONTHLY : 0
}

/**
 * Labour Welfare Fund, Karnataka — taken once a year, in December.
 *
 * `month` is 1-12. Nil in every other month.
 */
export function labourWelfareFund(month: number | null | undefined): number {
  return month === 12 ? KARNATAKA_LWF_ANNUAL : 0
}

/**
 * Whether provident fund applies to this kind of engagement.
 *
 * It does not for a contractor or an intern. Neither is on the rolls as an
 * employee, so there is no EPF membership to contribute to. Anybody else,
 * including part-time staff, is covered.
 *
 * An unknown or missing type is treated as covered. Erring towards deducting
 * is the safe direction: an over-deduction is refunded, a short deduction
 * costs the employer interest and damages.
 */
export function isPfApplicable(employmentType?: string | null): boolean {
  return !PF_EXEMPT_EMPLOYMENT_TYPES.includes(
    (employmentType ?? '') as (typeof PF_EXEMPT_EMPLOYMENT_TYPES)[number]
  )
}

/** Whether this engagement is a contractor, who is paid under deduction of tax. */
export function isContractor(employmentType?: string | null): boolean {
  return CONTRACTOR_EMPLOYMENT_TYPES.includes(
    (employmentType ?? '') as (typeof CONTRACTOR_EMPLOYMENT_TYPES)[number]
  )
}

/**
 * Tax deducted at source on a contractor's payment — 10%, under tax code 1027.
 *
 * Taken on the whole payment, because a contractor raises an invoice rather
 * than drawing a salary: there is no basic, and no exempt portion to carve
 * out. Nil for everybody else, who are taxed through their own TDS figure
 * from their investment declaration instead.
 */
export function contractorTds(grossMonthly: number, employmentType?: string | null): number {
  if (!isContractor(employmentType)) return 0
  return Math.round((grossMonthly * CONTRACTOR_TDS_RATE) / 100)
}

/**
 * The statutory deductions for one month.
 *
 * `payrollMonth` (1-12) is needed because labour welfare fund is annual and
 * falls in December. Leave it out and no LWF is charged, which is the right
 * answer for any month but December.
 *
 * `employmentType` decides provident fund and contractor TDS. Leave it out
 * and the person is treated as an ordinary employee: PF applies, no TDS.
 */
export function calculateStatutoryDeductions(
  basicMonthly: number,
  grossMonthly: number,
  payrollMonth?: number | null,
  employmentType?: string | null
) {
  const pfApplies = isPfApplicable(employmentType)
  const pfBasic = Math.min(basicMonthly, INDIA_PF_BASIC_LIMIT)
  const pfAmount = pfApplies ? Math.round((pfBasic * INDIA_PF_RATE) / 100) : 0
  const pfEmployee = pfAmount
  const pfEmployer = pfAmount

  const esiApplicable = grossMonthly <= INDIA_ESI_GROSS_LIMIT
  const esiEmployee = esiApplicable ? Math.round((grossMonthly * INDIA_ESI_EMPLOYEE_RATE) / 100) : 0
  const esiEmployer = esiApplicable ? Math.round((grossMonthly * INDIA_ESI_EMPLOYER_RATE) / 100) : 0

  const pt = professionalTaxKarnataka(grossMonthly)
  const lwf = labourWelfareFund(payrollMonth)
  const tdsContractor = contractorTds(grossMonthly, employmentType)

  return { pfEmployee, pfEmployer, esiEmployee, esiEmployer, pt, lwf, tdsContractor }
}

/**
 * A salary component as the calculator needs to see it.
 */
export interface PayrollComponentInput {
  salary_component_id: string
  component_code: string
  component_type: string
  calculation_type: string
  monthly_amount: number
  is_statutory: boolean
  statutory_type: string | null
}

/**
 * Statutory deductions that must be taken whether or not anybody attached
 * them to the employee.
 *
 * TDS is deliberately absent. It is driven by the employee's own investment
 * declaration and is typed in, so there is nothing to apply automatically.
 */
const ALWAYS_APPLIED_STATUTORY = new Set([
  'pf_employee',
  'pf_employer',
  'esi_employee',
  'esi_employer',
  'pt',
  'lwf',
])

/**
 * Statutory lines that apply only to some kinds of engagement.
 *
 * Provident fund is not added for a contractor or an intern. Contractor TDS
 * is added only for a contractor, and never for anybody else — an employee's
 * tax comes from their own declaration, not from a flat 10%.
 */
function appliesToEngagement(statutoryType: string, employmentType?: string | null): boolean {
  if (statutoryType === 'pf_employee' || statutoryType === 'pf_employer') {
    return isPfApplicable(employmentType)
  }
  if (statutoryType === 'tds_contractor') {
    return isContractor(employmentType)
  }
  return ALWAYS_APPLIED_STATUTORY.has(statutoryType)
}

/**
 * Adds the organisation's statutory components to an employee's own list.
 *
 * QA-23. The calculator used to walk only the components attached to the
 * employee's compensation, so provident fund, professional tax and labour
 * welfare fund were applied only if whoever set up the salary structure had
 * remembered to tick them. Ten of the eleven people in the first December run
 * were paid with no PF and no professional tax at all, and the December LWF
 * was taken from nobody — not even from the one employee whose structure did
 * carry PF and PT, because it had no LWF line.
 *
 * Under-deducting PF is not a display bug. The employer owes the arrears with
 * interest under section 7Q and damages under section 14B, and the employee's
 * account is short. The same money has to come out whether or not a form was
 * filled in correctly, so the deduction cannot be opt-in.
 *
 * An attached component always wins, so anything deliberately configured for
 * one person is left exactly as it is. Only genuinely missing statutory lines
 * are added, and only the ones listed above.
 */
export function withStatutoryComponents(
  attached: PayrollComponentInput[],
  orgStatutory: PayrollComponentInput[],
  employmentType?: string | null
): PayrollComponentInput[] {
  const present = new Set(
    attached
      .filter((c) => c.is_statutory && c.statutory_type)
      .map((c) => c.statutory_type as string)
  )

  const missing = orgStatutory.filter(
    (c) =>
      c.is_statutory &&
      c.statutory_type &&
      appliesToEngagement(c.statutory_type, employmentType) &&
      !present.has(c.statutory_type)
  )

  return [...attached, ...missing]
}

export function calculateLopDeduction(
  monthlyGross: number,
  totalWorkingDays: number,
  lopDays: number
): number {
  if (totalWorkingDays <= 0 || lopDays <= 0) return 0
  return Math.round((monthlyGross / totalWorkingDays) * lopDays)
}

export interface ComponentAmount {
  salary_component_id: string
  component_code: string
  amount: number
}

export interface PayrollComputationResult {
  earnings: ComponentAmount[]
  deductions: ComponentAmount[]
  employerContributions: ComponentAmount[]
  grossEarnings: number
  totalDeductions: number
  netPay: number
  totalEmployerContributions: number
}

export function computeEmployeePayroll(
  monthlyGross: number,
  attachedComponents: PayrollComponentInput[],
  adjustments: { adjustment_type: string; amount: number; salary_component_id: string | null }[],
  _workingDays: number,
  lopDays: number,
  totalWorkingDays: number,
  /** 1-12. Needed for labour welfare fund, which falls in December. */
  payrollMonth?: number | null,
  /**
   * The organisation's statutory components. Any of them the employee does
   * not already carry is applied anyway — see withStatutoryComponents.
   */
  orgStatutoryComponents: PayrollComponentInput[] = [],
  /**
   * full_time, contract, intern and so on. Decides provident fund and
   * contractor TDS. Left out, the person is treated as an ordinary employee.
   */
  employmentType?: string | null
): PayrollComputationResult {
  const components = withStatutoryComponents(
    attachedComponents,
    orgStatutoryComponents,
    employmentType
  )

  const earnings: ComponentAmount[] = []
  const deductions: ComponentAmount[] = []
  const employerContributions: ComponentAmount[] = []

  // Find basic for statutory calc
  const basicComp = components.find((c) => c.component_code === 'BASIC')
  const basicAmount = basicComp?.monthly_amount || monthlyGross * 0.4

  // LOP deduction
  const lopAmount = calculateLopDeduction(monthlyGross, totalWorkingDays, lopDays)
  const effectiveGross = monthlyGross - lopAmount

  // Process each component
  for (const comp of components) {
    let amount = comp.monthly_amount

    // Adjust proportionally for LOP
    if (lopDays > 0 && comp.component_type === 'earning') {
      amount = Math.round(amount * ((totalWorkingDays - lopDays) / totalWorkingDays))
    }

    // Override statutory amounts with actual calculations
    if (comp.is_statutory && comp.statutory_type) {
      const statutory = calculateStatutoryDeductions(
        basicAmount,
        effectiveGross,
        payrollMonth,
        employmentType
      )
      switch (comp.statutory_type) {
        case 'pf_employee': amount = statutory.pfEmployee; break
        case 'pf_employer': amount = statutory.pfEmployer; break
        case 'esi_employee': amount = statutory.esiEmployee; break
        case 'esi_employer': amount = statutory.esiEmployer; break
        case 'pt': amount = statutory.pt; break
        case 'lwf': amount = statutory.lwf; break
        case 'tds_contractor': amount = statutory.tdsContractor; break
        case 'tds': amount = comp.monthly_amount; break // TDS entered manually
      }
    }

    if (amount <= 0) continue

    const entry = { salary_component_id: comp.salary_component_id, component_code: comp.component_code, amount }

    switch (comp.component_type) {
      case 'earning':
        earnings.push(entry)
        break
      case 'deduction':
        deductions.push(entry)
        break
      case 'employer_contribution':
        employerContributions.push(entry)
        break
    }
  }

  // Apply adjustments
  for (const adj of adjustments) {
    const entry = { salary_component_id: adj.salary_component_id || '', component_code: 'ADJ', amount: adj.amount }
    if (adj.adjustment_type === 'addition') {
      earnings.push(entry)
    } else {
      deductions.push(entry)
    }
  }

  const grossEarnings = earnings.reduce((sum, e) => sum + e.amount, 0)
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0)
  const netPay = grossEarnings - totalDeductions
  const totalEmployerContributions = employerContributions.reduce((sum, c) => sum + c.amount, 0)

  return { earnings, deductions, employerContributions, grossEarnings, totalDeductions, netPay, totalEmployerContributions }
}

export function generatePayslipNumber(month: number, year: number, sequence: number): string {
  const mm = String(month).padStart(2, '0')
  const seq = String(sequence).padStart(4, '0')
  return `PS-${year}${mm}-${seq}`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getMonthName(month: number): string {
  return new Date(2000, month - 1).toLocaleString('en', { month: 'long' })
}

// ============================================
// CSV Export Utilities
// ============================================

export interface PayrollCSVRow {
  employeeName: string
  employeeCode: string
  netPay: number
  bankName: string
  accountNumber: string
  ifscCode: string
}

// The period is carried in the filename, not the rows: this file is a bank
// transfer list and the columns are fixed by what the bank accepts.
export function generatePayrollCSV(rows: PayrollCSVRow[], _month: number, _year: number): string {
  const header = ['Employee Name', 'Employee Code', 'Net Pay (INR)', 'Bank Name', 'Account Number', 'IFSC Code']
  const csvRows = [
    header.join(','),
    ...rows.map((r) =>
      [
        `"${r.employeeName}"`,
        r.employeeCode,
        r.netPay.toFixed(2),
        `"${r.bankName}"`,
        `"${r.accountNumber}"`,
        r.ifscCode,
      ].join(',')
    ),
  ]
  return csvRows.join('\n')
}

export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
