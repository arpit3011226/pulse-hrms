import { supabase } from '@/lib/supabase'
import type { TaxDeclaration, TaxDeclarationStatus } from '@/types/database.types'
import {
  calculateAnnualTax,
  calculateMonthlyTds,
  getContractorTds,
  getCurrentFinancialYear,
  type Exemptions,
} from '../utils/tax-calculator'
import type { TaxRegime } from '@/types/database.types'

// ============================================
// Tax Declarations
// ============================================

export async function getTaxDeclarations(orgId: string, financialYear?: string) {
  let query = supabase
    .from('employee_tax_declarations')
    .select(
      '*, employee:employees(id, first_name, last_name, email, employee_code, department_id, employment_type, department:departments!department_id(id, name)), verifier:employees!employee_tax_declarations_verified_by_fkey(id, first_name, last_name)'
    )
    .eq('organization_id', orgId)

  if (financialYear) {
    query = query.eq('financial_year', financialYear)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getMyTaxDeclaration(employeeId: string, financialYear: string) {
  const { data, error } = await supabase
    .from('employee_tax_declarations')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('financial_year', financialYear)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createTaxDeclaration(data: Partial<TaxDeclaration>) {
  const { data: result, error } = await supabase
    .from('employee_tax_declarations')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result
}

export async function updateTaxDeclaration(id: string, updates: Partial<TaxDeclaration>) {
  const { data, error } = await supabase
    .from('employee_tax_declarations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function verifyTaxDeclaration(
  id: string,
  verifiedBy: string,
  status: 'verified' | 'rejected',
  remarks?: string
) {
  const { data, error } = await supabase
    .from('employee_tax_declarations')
    .update({
      status,
      verified_by: verifiedBy,
      verified_at: new Date().toISOString(),
      remarks: remarks ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ============================================
// TDS Calculation
// ============================================

/**
 * Compute TDS for a salaried employee using their compensation and declaration.
 */
export async function calculateTds(employeeId: string, financialYear?: string) {
  const fy = financialYear || getCurrentFinancialYear()

  // 1. Get employee compensation (current)
  const { data: compensation, error: compError } = await supabase
    .from('employee_compensation')
    .select('monthly_gross, annual_ctc')
    .eq('employee_id', employeeId)
    .eq('is_current', true)
    .maybeSingle()
  if (compError) throw compError
  if (!compensation) return null

  // 2. Get tax declaration for this FY
  const { data: declaration, error: declError } = await supabase
    .from('employee_tax_declarations')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('financial_year', fy)
    .maybeSingle()
  if (declError) throw declError

  const annualIncome = compensation.annual_ctc || compensation.monthly_gross * 12
  const regime: TaxRegime = declaration?.tax_regime || 'new'

  const exemptions: Exemptions =
    declaration && regime === 'old'
      ? {
          section_80c: declaration.section_80c,
          section_80d: declaration.section_80d,
          home_loan_interest: declaration.home_loan_interest,
          hra_claimed: declaration.hra_claimed,
          nps_contribution: declaration.nps_contribution,
          other_deductions: declaration.other_deductions,
        }
      : {}

  // 3. Get TDS already paid in current FY
  const { data: tdsRecords, error: tdsError } = await supabase
    .from('employee_tds_records')
    .select('tds_deducted')
    .eq('employee_id', employeeId)
    .eq('financial_year', fy)
  if (tdsError) throw tdsError

  const tdsPaidSoFar = (tdsRecords || []).reduce((sum, r) => sum + (r.tds_deducted || 0), 0)

  // 4. Calculate months remaining in FY
  const now = new Date()
  const fyStartYear = parseInt(fy.split('-')[0])
  // FY starts April
  const fyStartDate = new Date(fyStartYear, 3, 1) // April 1
  const fyEndDate = new Date(fyStartYear + 1, 2, 31) // March 31

  let monthsRemaining = 12
  if (now >= fyStartDate && now <= fyEndDate) {
    const currentMonth = now.getMonth() // 0-based
    // Months left: from current month to March (month 2 of next year)
    if (currentMonth >= 3) {
      monthsRemaining = 12 - (currentMonth - 3)
    } else {
      monthsRemaining = 3 - currentMonth
    }
    monthsRemaining = Math.max(1, monthsRemaining)
  }

  const breakdown = calculateAnnualTax(annualIncome, regime, exemptions)
  const monthlyTds = calculateMonthlyTds(annualIncome, regime, exemptions, monthsRemaining, tdsPaidSoFar)

  return {
    annualIncome,
    regime,
    exemptions,
    breakdown,
    monthlyTds,
    tdsPaidSoFar,
    monthsRemaining,
  }
}

// ============================================
// Contractor TDS Rate
// ============================================

/**
 * Return the applicable TDS rate for contractors based on employment type.
 * - contract → Section 194C (1% individual, 2% others)
 * - consultant / freelance → Section 194J (10%)
 */
export function getContractorTdsRate(employmentType: string) {
  if (employmentType === 'consultant' || employmentType === 'freelance') {
    return { section: '194J' as const, rate: 10, description: 'Professional/Technical Services' }
  }
  // Default: contract
  return { section: '194C' as const, rate: 1, description: 'Contractual Payments (Individual/HUF)' }
}

// ============================================
// TDS Records
// ============================================

export async function getTdsRecords(orgId: string, financialYear: string) {
  const { data, error } = await supabase
    .from('employee_tds_records')
    .select(
      '*, employee:employees(id, first_name, last_name, email, employee_code)'
    )
    .eq('organization_id', orgId)
    .eq('financial_year', financialYear)
    .order('year')
    .order('month')
  if (error) throw error
  return data
}

export async function upsertTdsRecord(record: {
  organization_id: string
  employee_id: string
  financial_year: string
  month: number
  year: number
  projected_annual_income?: number
  total_exemptions?: number
  taxable_income?: number
  annual_tax_liability?: number
  monthly_tds?: number
  tds_deducted?: number
  tds_section?: string
  payslip_id?: string
}) {
  const { data, error } = await supabase
    .from('employee_tds_records')
    .upsert(record, { onConflict: 'organization_id,employee_id,month,year' })
    .select()
    .single()
  if (error) throw error
  return data
}
