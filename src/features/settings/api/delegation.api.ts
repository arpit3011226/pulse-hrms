import { supabase } from '@/lib/supabase'

/**
 * F44 — Approval delegation.
 *
 * Delegation decides WHO MAY ACT on an approval while the usual approver is
 * away. It does not change the reporting line, so org charts, reviews and
 * reports are unaffected.
 */

export interface ApprovalDelegation {
  id: string
  organization_id: string
  delegator_id: string
  delegate_id: string
  start_date: string
  end_date: string
  reason: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  delegator?: { id: string; first_name: string; last_name: string } | null
  delegate?: { id: string; first_name: string; last_name: string } | null
}

const SELECT_WITH_NAMES =
  '*, delegator:employees!approval_delegations_delegator_id_fkey(id, first_name, last_name),' +
  ' delegate:employees!approval_delegations_delegate_id_fkey(id, first_name, last_name)'

/** Delegations I set up, plus any where I am the cover. */
export async function getMyDelegations(employeeId: string) {
  const { data, error } = await supabase
    .from('approval_delegations')
    .select(SELECT_WITH_NAMES)
    .or(`delegator_id.eq.${employeeId},delegate_id.eq.${employeeId}`)
    .order('start_date', { ascending: false })
  if (error) throw error
  return data as unknown as ApprovalDelegation[]
}

/** Every delegation in the organisation — HR and admin view. */
export async function getAllDelegations(orgId: string) {
  const { data, error } = await supabase
    .from('approval_delegations')
    .select(SELECT_WITH_NAMES)
    .eq('organization_id', orgId)
    .order('start_date', { ascending: false })
  if (error) throw error
  return data as unknown as ApprovalDelegation[]
}

export async function createDelegation(payload: Partial<ApprovalDelegation>) {
  const { data, error } = await supabase
    .from('approval_delegations')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function revokeDelegation(id: string) {
  const { error } = await supabase
    .from('approval_delegations')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw error
}

export async function deleteDelegation(id: string) {
  const { error } = await supabase.from('approval_delegations').delete().eq('id', id)
  if (error) throw error
}

/**
 * Employee ids whose approvals I may act on today because they delegated to me.
 * Callers add their own id to this list.
 */
export async function getDelegatedManagerIds(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_delegated_manager_ids')
  if (error) throw error
  if (!data) return []
  // The function returns a set of uuids; supabase-js gives either bare values
  // or single-key objects depending on the shape, so handle both.
  return (data as unknown[])
    .map((row) =>
      typeof row === 'string'
        ? row
        : (row as Record<string, string>)?.get_delegated_manager_ids ??
          Object.values(row as Record<string, string>)[0]
    )
    .filter(Boolean) as string[]
}
