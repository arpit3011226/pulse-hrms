import { supabase } from '@/lib/supabase'

export type AssetStatus = 'available' | 'assigned' | 'in_repair' | 'retired' | 'lost'
export type AssetCondition = 'new' | 'good' | 'fair' | 'poor' | 'damaged'
export type AssignmentStatus = 'assigned' | 'returned' | 'pending_return' | 'not_returned'

export const ASSET_TYPES = [
  'laptop', 'desktop', 'monitor', 'phone', 'sim', 'id_card', 'access_card',
  'headset', 'furniture', 'vehicle', 'software_licence', 'other',
] as const

export const ASSET_TYPE_LABELS: Record<string, string> = {
  laptop: 'Laptop', desktop: 'Desktop', monitor: 'Monitor', phone: 'Phone',
  sim: 'SIM card', id_card: 'ID card', access_card: 'Access card',
  headset: 'Headset', furniture: 'Furniture', vehicle: 'Vehicle',
  software_licence: 'Software licence', other: 'Other',
}

export interface Asset {
  id: string
  organization_id: string
  asset_code: string
  asset_type: string
  name: string
  make: string | null
  model: string | null
  serial_number: string | null
  purchase_date: string | null
  purchase_cost: number | null
  warranty_expiry: string | null
  condition: AssetCondition | null
  status: AssetStatus
  notes: string | null
  created_at: string
}

export interface AssetAssignment {
  id: string
  organization_id: string
  asset_id: string
  employee_id: string
  assigned_on: string
  assigned_by: string | null
  assignment_notes: string | null
  returned_on: string | null
  return_condition: AssetCondition | null
  return_notes: string | null
  status: AssignmentStatus
  asset?: Asset | null
  employee?: { id: string; first_name: string; last_name: string; employee_code: string | null } | null
}

const ASSIGNMENT_SELECT =
  '*, asset:assets(*), employee:employees!asset_assignments_employee_id_fkey(id, first_name, last_name, employee_code)'

// ── Assets ──────────────────────────────────────────────────────────────────

export async function getAssets(orgId: string) {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('organization_id', orgId)
    .order('asset_code')
  if (error) throw error
  return data as Asset[]
}

export async function createAsset(payload: Partial<Asset>) {
  const { data, error } = await supabase.from('assets').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateAsset(id: string, updates: Partial<Asset>) {
  const { data, error } = await supabase.from('assets').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteAsset(id: string) {
  const { error } = await supabase.from('assets').delete().eq('id', id)
  if (error) throw error
}

/** Next code in the ASSET-0001 series. */
export async function generateNextAssetCode(orgId: string): Promise<string> {
  const { data, error } = await supabase
    .from('assets')
    .select('asset_code')
    .eq('organization_id', orgId)
    .ilike('asset_code', 'AST-%')
    .order('asset_code', { ascending: false })
    .limit(1)
  if (error) throw error

  let next = 1
  const code = data?.[0]?.asset_code
  if (code) {
    const m = code.match(/AST-(\d+)/)
    if (m) next = parseInt(m[1], 10) + 1
  }
  return `AST-${String(next).padStart(4, '0')}`
}

// ── Assignments ─────────────────────────────────────────────────────────────

export async function getAssignments(orgId: string) {
  const { data, error } = await supabase
    .from('asset_assignments')
    .select(ASSIGNMENT_SELECT)
    .eq('organization_id', orgId)
    .order('assigned_on', { ascending: false })
  if (error) throw error
  return data as unknown as AssetAssignment[]
}

/** What this person is holding right now. */
export async function getEmployeeAssets(employeeId: string) {
  const { data, error } = await supabase
    .from('asset_assignments')
    .select(ASSIGNMENT_SELECT)
    .eq('employee_id', employeeId)
    .in('status', ['assigned', 'pending_return'])
    .order('assigned_on')
  if (error) throw error
  return data as unknown as AssetAssignment[]
}

export async function assignAsset(payload: {
  organization_id: string
  asset_id: string
  employee_id: string
  assigned_on: string
  assigned_by?: string | null
  assignment_notes?: string | null
}) {
  const { data, error } = await supabase
    .from('asset_assignments')
    .insert({ ...payload, status: 'assigned' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function returnAsset(params: {
  assignmentId: string
  returnedOn: string
  returnCondition?: AssetCondition | null
  returnNotes?: string | null
  returnedTo?: string | null
}) {
  const { data, error } = await supabase
    .from('asset_assignments')
    .update({
      status: 'returned',
      returned_on: params.returnedOn,
      return_condition: params.returnCondition ?? null,
      return_notes: params.returnNotes ?? null,
      returned_to: params.returnedTo ?? null,
    })
    .eq('id', params.assignmentId)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Mark everything this person holds as awaiting return — used when they resign. */
export async function flagAssetsForReturn(employeeId: string) {
  const { error } = await supabase
    .from('asset_assignments')
    .update({ status: 'pending_return' })
    .eq('employee_id', employeeId)
    .eq('status', 'assigned')
  if (error) throw error
}
