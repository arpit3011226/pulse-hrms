import { supabase } from '@/lib/supabase'

/**
 * F38–F42 — Retire / Alumni.
 *
 * An ex-employee keeps their login (on their personal email, per F43) and can
 * fetch their own payslips and letters. Their employees row is never deleted —
 * only its status changes — so "my own records" policies keep working.
 */

export interface FinalSettlement {
  id: string
  organization_id: string
  employee_id: string
  last_working_date: string
  settlement_date: string | null
  pending_salary: number
  leave_encashment: number
  gratuity: number
  bonus_or_incentive: number
  other_earnings: number
  notice_period_recovery: number
  asset_recovery: number
  advance_recovery: number
  tax_deducted: number
  other_deductions: number
  net_payable: number
  status: 'draft' | 'pending_approval' | 'approved' | 'paid' | 'cancelled'
  paid_on: string | null
  payment_reference: string | null
  notes: string | null
  employee?: {
    id: string; first_name: string; last_name: string
    employee_code: string | null; email: string
  } | null
}

export const EARNING_FIELDS = [
  ['pending_salary', 'Pending salary'],
  ['leave_encashment', 'Leave encashment'],
  ['gratuity', 'Gratuity'],
  ['bonus_or_incentive', 'Bonus or incentive'],
  ['other_earnings', 'Other earnings'],
] as const

export const DEDUCTION_FIELDS = [
  ['notice_period_recovery', 'Notice period shortfall'],
  ['asset_recovery', 'Unreturned assets'],
  ['advance_recovery', 'Advance recovery'],
  ['tax_deducted', 'Tax deducted'],
  ['other_deductions', 'Other deductions'],
] as const

const SETTLEMENT_SELECT =
  '*, employee:employees!final_settlements_employee_id_fkey(id, first_name, last_name, employee_code, email)'

export function computeNetPayable(s: Partial<FinalSettlement>): number {
  const earn = EARNING_FIELDS.reduce((sum, [f]) => sum + Number(s[f] ?? 0), 0)
  const ded = DEDUCTION_FIELDS.reduce((sum, [f]) => sum + Number(s[f] ?? 0), 0)
  return earn - ded
}

// ── Settlements ─────────────────────────────────────────────────────────────

export async function getSettlements(orgId: string) {
  const { data, error } = await supabase
    .from('final_settlements')
    .select(SETTLEMENT_SELECT)
    .eq('organization_id', orgId)
    .order('last_working_date', { ascending: false })
  if (error) throw error
  return data as unknown as FinalSettlement[]
}

export async function upsertSettlement(payload: Partial<FinalSettlement> & { id?: string }) {
  const body = { ...payload, net_payable: computeNetPayable(payload) }
  if (payload.id) {
    const { data, error } = await supabase
      .from('final_settlements')
      .update(body)
      .eq('id', payload.id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase
    .from('final_settlements')
    .insert(body)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function setSettlementStatus(params: {
  id: string
  status: FinalSettlement['status']
  approvedBy?: string | null
  paidOn?: string | null
  paymentReference?: string | null
}) {
  const { data, error } = await supabase
    .from('final_settlements')
    .update({
      status: params.status,
      approved_by: params.status === 'approved' ? params.approvedBy ?? null : undefined,
      approved_at: params.status === 'approved' ? new Date().toISOString() : undefined,
      paid_on: params.status === 'paid' ? params.paidOn ?? null : undefined,
      payment_reference: params.status === 'paid' ? params.paymentReference ?? null : undefined,
    })
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Alumni directory (F40) ──────────────────────────────────────────────────

export async function getAlumni(orgId: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email, personal_email, employee_code, date_of_joining, status, department:departments!department_id(id, name), designation:designations!designation_id(id, title)')
    .eq('organization_id', orgId)
    .in('status', ['resigned', 'terminated', 'absconding', 'retired'])
    .order('first_name')
  if (error) throw error
  return data
}

export async function getExitRecords(orgId: string) {
  const { data, error } = await supabase
    .from('employee_exit_records')
    .select('*, employee:employees!employee_exit_records_employee_id_fkey(id, first_name, last_name, employee_code)')
    .eq('organization_id', orgId)
    .order('last_working_date', { ascending: false })
  if (error) throw error
  return data
}

export async function setRehireEligibility(params: {
  exitRecordId: string
  eligible: boolean
  notes?: string | null
}) {
  const { data, error } = await supabase
    .from('employee_exit_records')
    .update({ rehire_eligible: params.eligible, rehire_notes: params.notes ?? null })
    .eq('id', params.exitRecordId)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Move the login to the alumni role so they keep their documents and nothing else. */
export async function markAsAlumni(employeeId: string) {
  const { error } = await supabase.rpc('mark_as_alumni', { p_employee_id: employeeId })
  if (error) throw error
}

// ── Exit interview (F42) ────────────────────────────────────────────────────

export async function getExitQuestions(orgId: string) {
  const { data, error } = await supabase
    .from('exit_interview_questions')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw error
  return data
}

export async function createExitQuestion(payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('exit_interview_questions')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getExitResponses(orgId: string) {
  const { data, error } = await supabase
    .from('exit_interview_responses')
    .select('*')
    .eq('organization_id', orgId)
  if (error) throw error
  return data
}

export async function saveExitResponses(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return []
  const { data, error } = await supabase.from('exit_interview_responses').insert(rows).select()
  if (error) throw error
  return data
}

// ── F39: what an alumnus can fetch about themselves ─────────────────────────

export async function getMyAlumniRecords(profileId: string) {
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email, personal_email, employee_code, date_of_joining, status')
    .eq('profile_id', profileId)
    .maybeSingle()
  if (empError) throw empError
  if (!employee) return null

  const [payslipsRes, lettersRes, settlementRes, exitRes] = await Promise.all([
    supabase
      .from('payslips')
      .select('id, payslip_number, payroll_month, payroll_year, gross_earnings, total_deductions, net_pay, published_flag')
      .eq('employee_id', employee.id)
      .order('payroll_year', { ascending: false })
      .order('payroll_month', { ascending: false }),
    supabase
      .from('letter_requests')
      .select('id, status, created_at, letter_template:letter_templates(id, name, category)')
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('final_settlements')
      .select('*')
      .eq('employee_id', employee.id)
      .maybeSingle(),
    supabase
      .from('employee_exit_records')
      .select('id, last_working_date, exit_type, status')
      .eq('employee_id', employee.id)
      .maybeSingle(),
  ])

  return {
    employee,
    payslips: payslipsRes.data ?? [],
    letters: lettersRes.data ?? [],
    settlement: settlementRes.data ?? null,
    exit: exitRes.data ?? null,
  }
}
