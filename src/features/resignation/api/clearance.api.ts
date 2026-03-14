import { supabase } from '@/lib/supabase'
import type { ExitClearance } from '@/types/database.types'

// ============================================================================
// GET CLEARANCES FOR AN EXIT RECORD
// ============================================================================

export async function getClearances(exitRecordId: string) {
  const { data, error } = await supabase
    .from('exit_clearances')
    .select('*')
    .eq('exit_record_id', exitRecordId)
    .order('department_name')
  if (error) throw error
  return data as ExitClearance[]
}

// ============================================================================
// GET CLEARANCES BY ORG (grouped by exit record)
// ============================================================================

export async function getClearancesByOrg(orgId: string) {
  const { data, error } = await supabase
    .from('exit_clearances')
    .select(`
      *,
      exit_record:employee_exit_records!exit_record_id(
        id, employee_id, resignation_date, last_working_date, status,
        employee:employees!employee_id(
          id, first_name, last_name, employee_code, email,
          department:departments!department_id(name),
          designation:designations!designation_id(title)
        )
      )
    `)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ============================================================================
// GET ALL PENDING CLEARANCES
// ============================================================================

export async function getAllPendingClearances(orgId: string) {
  const { data, error } = await supabase
    .from('exit_clearances')
    .select(`
      *,
      exit_record:employee_exit_records!exit_record_id(
        id, employee_id, resignation_date, last_working_date, status,
        employee:employees!employee_id(
          id, first_name, last_name, employee_code, email,
          department:departments!department_id(name),
          designation:designations!designation_id(title)
        )
      )
    `)
    .eq('organization_id', orgId)
    .eq('clearance_status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ============================================================================
// UPDATE CLEARANCE
// ============================================================================

export async function updateClearance(
  clearanceId: string,
  status: ExitClearance['clearance_status'],
  notes: string | null,
  clearedByEmployeeId: string
) {
  const { data: clearance, error } = await supabase
    .from('exit_clearances')
    .update({
      clearance_status: status,
      notes,
      cleared_by: clearedByEmployeeId,
      cleared_at: new Date().toISOString(),
    })
    .eq('id', clearanceId)
    .select()
    .single()
  if (error) throw error

  // Check if ALL clearances for this exit record are now 'no_objection'
  const { data: allClearances, error: fetchError } = await supabase
    .from('exit_clearances')
    .select('clearance_status')
    .eq('exit_record_id', clearance.exit_record_id)
  if (fetchError) throw fetchError

  const allCleared = allClearances.every((c) => c.clearance_status === 'no_objection')

  if (allCleared) {
    await supabase
      .from('employee_exit_records')
      .update({
        clearance_status: 'completed' as const,
        status: 'clearance_completed' as const,
      })
      .eq('id', clearance.exit_record_id)
  }

  return clearance as ExitClearance
}
