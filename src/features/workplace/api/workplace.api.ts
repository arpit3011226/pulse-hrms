import { supabase } from '@/lib/supabase'

/** F31, F34, F46, F47, F49, F50 — the workplace features added in Phase 6. */

// ── F31: travel ─────────────────────────────────────────────────────────────

export const TRAVEL_STATUSES = [
  'draft', 'pending_manager', 'pending_finance', 'approved', 'rejected', 'cancelled', 'completed',
] as const

export interface TravelRequest {
  id: string
  organization_id: string
  request_number: string
  employee_id: string
  purpose: string
  travel_type: 'domestic' | 'international' | 'local'
  from_location: string | null
  to_location: string
  departure_date: string
  return_date: string | null
  estimated_travel_cost: number
  estimated_stay_cost: number
  estimated_other_cost: number
  advance_requested: number
  advance_paid: number
  status: (typeof TRAVEL_STATUSES)[number]
  manager_id: string | null
  manager_remarks: string | null
  finance_remarks: string | null
  created_at: string
  employee?: { id: string; first_name: string; last_name: string; employee_code: string | null } | null
}

const TRAVEL_SELECT =
  '*, employee:employees!travel_requests_employee_id_fkey(id, first_name, last_name, employee_code)'

export function travelTotal(t: Partial<TravelRequest>): number {
  return (
    Number(t.estimated_travel_cost ?? 0) +
    Number(t.estimated_stay_cost ?? 0) +
    Number(t.estimated_other_cost ?? 0)
  )
}

export async function getTravelRequests(orgId: string) {
  const { data, error } = await supabase
    .from('travel_requests')
    .select(TRAVEL_SELECT)
    .eq('organization_id', orgId)
    .order('departure_date', { ascending: false })
  if (error) throw error
  return data as unknown as TravelRequest[]
}

async function nextTravelNumber(orgId: string): Promise<string> {
  const { data } = await supabase
    .from('travel_requests')
    .select('request_number')
    .eq('organization_id', orgId)
    .ilike('request_number', 'TR-%')
    .order('request_number', { ascending: false })
    .limit(1)
  let n = 1
  const c = data?.[0]?.request_number
  if (c) { const m = c.match(/TR-(\d+)/); if (m) n = parseInt(m[1], 10) + 1 }
  return `TR-${String(n).padStart(4, '0')}`
}

export async function createTravelRequest(payload: Partial<TravelRequest> & { organization_id: string }) {
  const { data, error } = await supabase
    .from('travel_requests')
    .insert({ ...payload, request_number: await nextTravelNumber(payload.organization_id) })
    .select().single()
  if (error) throw error
  return data
}

export async function updateTravelRequest(id: string, updates: Partial<TravelRequest>) {
  const { data, error } = await supabase
    .from('travel_requests').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ── F34: recognition ────────────────────────────────────────────────────────

export async function getRecognitions(orgId: string) {
  const { data, error } = await supabase
    .from('recognitions')
    .select('*, giver:employees!recognitions_given_by_fkey(id, first_name, last_name), receiver:employees!recognitions_given_to_fkey(id, first_name, last_name), value:recognition_values(id, name, icon)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data
}

export async function getRecognitionValues(orgId: string) {
  const { data, error } = await supabase
    .from('recognition_values').select('*').eq('organization_id', orgId)
    .eq('is_active', true).order('sort_order')
  if (error) throw error
  return data
}

export async function giveRecognition(payload: Record<string, unknown>) {
  const { data, error } = await supabase.from('recognitions').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function createRecognitionValue(payload: Record<string, unknown>) {
  const { data, error } = await supabase.from('recognition_values').insert(payload).select().single()
  if (error) throw error
  return data
}

// ── F46: policies ───────────────────────────────────────────────────────────

export async function getPolicies(orgId: string) {
  const { data, error } = await supabase
    .from('company_policies').select('*').eq('organization_id', orgId)
    .order('effective_from', { ascending: false })
  if (error) throw error
  return data
}

export async function createPolicy(payload: Record<string, unknown>) {
  const { data, error } = await supabase.from('company_policies').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function getMyAcknowledgements(employeeId: string) {
  const { data, error } = await supabase
    .from('policy_acknowledgements').select('*').eq('employee_id', employeeId)
  if (error) throw error
  return data
}

export async function getAllAcknowledgements(orgId: string) {
  const { data, error } = await supabase
    .from('policy_acknowledgements')
    .select('*, employee:employees!policy_acknowledgements_employee_id_fkey(id, first_name, last_name)')
    .eq('organization_id', orgId)
  if (error) throw error
  return data
}

export async function acknowledgePolicy(payload: {
  organization_id: string
  policy_id: string
  employee_id: string
  policy_version: string | null
}) {
  const { data, error } = await supabase
    .from('policy_acknowledgements').insert(payload).select().single()
  if (error) throw error
  return data
}

// ── F47: notification preferences ───────────────────────────────────────────

export const NOTIFICATION_CATEGORIES = [
  { key: 'leave', label: 'Leave' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'payroll', label: 'Payroll and payslips' },
  { key: 'performance', label: 'Performance' },
  { key: 'helpdesk', label: 'Helpdesk' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'announcements', label: 'Announcements' },
] as const

export async function getNotificationPreferences(employeeId: string) {
  const { data, error } = await supabase
    .from('notification_preferences').select('*').eq('employee_id', employeeId)
  if (error) throw error
  return data
}

export async function upsertNotificationPreference(payload: {
  organization_id: string
  employee_id: string
  category: string
  in_app: boolean
  email: boolean
  frequency: string
}) {
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(payload, { onConflict: 'employee_id,category' })
    .select().single()
  if (error) throw error
  return data
}

// ── F49: DPDP ───────────────────────────────────────────────────────────────

export async function getDataRequests(orgId: string) {
  const { data, error } = await supabase
    .from('data_requests')
    .select('*, employee:employees!data_requests_employee_id_fkey(id, first_name, last_name, email)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createDataRequest(payload: Record<string, unknown>) {
  const { data, error } = await supabase.from('data_requests').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateDataRequest(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('data_requests').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

/**
 * Everything held about one employee, for a DPDP access request.
 * Read-only; produces JSON the person can be handed.
 */
export async function exportEmployeeData(employeeId: string) {
  const tables = [
    'employees', 'employee_addresses', 'employee_bank_accounts', 'employee_dependents',
    'employee_nominees', 'employee_emergency_contacts', 'employee_identity_documents',
    'employee_documents', 'employee_previous_experience', 'attendance_records',
    'leave_requests', 'leave_balances', 'payslips', 'employee_compensation',
    'employee_tax_declarations', 'performance_reviews', 'employee_goals',
  ]
  const out: Record<string, unknown> = { exported_at: new Date().toISOString() }
  for (const t of tables) {
    const column = t === 'employees' ? 'id' : 'employee_id'
    const { data } = await supabase.from(t).select('*').eq(column, employeeId)
    out[t] = data ?? []
  }
  return out
}

// ── F50: audit log ──────────────────────────────────────────────────────────

export async function getAuditLog(orgId: string, limit = 200) {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('organization_id', orgId)
    .order('changed_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
