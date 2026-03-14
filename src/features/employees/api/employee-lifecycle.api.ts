import { supabase } from '@/lib/supabase'
import type {
  EmployeeAddress,
  EmployeeEmergencyContact,
  EmployeeIdentityDocument,
  EmployeeBankAccount,
  EmployeeDependent,
  EmployeeNominee,
  EmployeeWorkProfile,
  EmployeeExitRecord,
  EmployeeStatusHistory,
  EmployeeOrgHistory,
  EmployeeDocument,
  EmployeePreviousExperience,
} from '@/types/database.types'

// ============================================================================
// ADDRESSES
// ============================================================================

export async function getEmployeeAddresses(employeeId: string) {
  const { data, error } = await supabase
    .from('employee_addresses')
    .select('*')
    .eq('employee_id', employeeId)
    .order('address_type')
  if (error) throw error
  return data as EmployeeAddress[]
}

export async function createEmployeeAddress(address: Partial<EmployeeAddress>) {
  const { data, error } = await supabase
    .from('employee_addresses')
    .insert(address)
    .select()
    .single()
  if (error) throw error
  return data as EmployeeAddress
}

export async function updateEmployeeAddress(id: string, updates: Partial<EmployeeAddress>) {
  const { data, error } = await supabase
    .from('employee_addresses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as EmployeeAddress
}

export async function deleteEmployeeAddress(id: string) {
  const { error } = await supabase
    .from('employee_addresses')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ============================================================================
// EMERGENCY CONTACTS
// ============================================================================

export async function getEmergencyContacts(employeeId: string) {
  const { data, error } = await supabase
    .from('employee_emergency_contacts')
    .select('*')
    .eq('employee_id', employeeId)
    .order('priority_order')
  if (error) throw error
  return data as EmployeeEmergencyContact[]
}

export async function createEmergencyContact(contact: Partial<EmployeeEmergencyContact>) {
  const { data, error } = await supabase
    .from('employee_emergency_contacts')
    .insert(contact)
    .select()
    .single()
  if (error) throw error
  return data as EmployeeEmergencyContact
}

export async function updateEmergencyContact(id: string, updates: Partial<EmployeeEmergencyContact>) {
  const { data, error } = await supabase
    .from('employee_emergency_contacts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as EmployeeEmergencyContact
}

export async function deleteEmergencyContact(id: string) {
  const { error } = await supabase
    .from('employee_emergency_contacts')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ============================================================================
// IDENTITY DOCUMENTS
// ============================================================================

export async function getIdentityDocuments(employeeId: string) {
  const { data, error } = await supabase
    .from('employee_identity_documents')
    .select('*')
    .eq('employee_id', employeeId)
    .order('document_type')
  if (error) throw error
  return data as EmployeeIdentityDocument[]
}

export async function createIdentityDocument(doc: Partial<EmployeeIdentityDocument>) {
  const { data, error } = await supabase
    .from('employee_identity_documents')
    .insert(doc)
    .select()
    .single()
  if (error) throw error
  return data as EmployeeIdentityDocument
}

export async function updateIdentityDocument(id: string, updates: Partial<EmployeeIdentityDocument>) {
  const { data, error } = await supabase
    .from('employee_identity_documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as EmployeeIdentityDocument
}

export async function deleteIdentityDocument(id: string) {
  const { error } = await supabase
    .from('employee_identity_documents')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ============================================================================
// BANK ACCOUNTS
// ============================================================================

export async function getBankAccounts(employeeId: string) {
  const { data, error } = await supabase
    .from('employee_bank_accounts')
    .select('*')
    .eq('employee_id', employeeId)
    .order('is_salary_account', { ascending: false })
  if (error) throw error
  return data as EmployeeBankAccount[]
}

export async function createBankAccount(account: Partial<EmployeeBankAccount>) {
  const { data, error } = await supabase
    .from('employee_bank_accounts')
    .insert(account)
    .select()
    .single()
  if (error) throw error
  return data as EmployeeBankAccount
}

export async function updateBankAccount(id: string, updates: Partial<EmployeeBankAccount>) {
  const { data, error } = await supabase
    .from('employee_bank_accounts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as EmployeeBankAccount
}

export async function deleteBankAccount(id: string) {
  const { error } = await supabase
    .from('employee_bank_accounts')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function setSalaryAccount(employeeId: string, accountId: string) {
  // Unset all salary accounts for this employee
  await supabase
    .from('employee_bank_accounts')
    .update({ is_salary_account: false })
    .eq('employee_id', employeeId)
  // Set the chosen one
  const { data, error } = await supabase
    .from('employee_bank_accounts')
    .update({ is_salary_account: true })
    .eq('id', accountId)
    .select()
    .single()
  if (error) throw error
  return data as EmployeeBankAccount
}

// ============================================================================
// DEPENDENTS
// ============================================================================

export async function getDependents(employeeId: string) {
  const { data, error } = await supabase
    .from('employee_dependents')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at')
  if (error) throw error
  return data as EmployeeDependent[]
}

export async function createDependent(dependent: Partial<EmployeeDependent>) {
  const { data, error } = await supabase
    .from('employee_dependents')
    .insert(dependent)
    .select()
    .single()
  if (error) throw error
  return data as EmployeeDependent
}

export async function updateDependent(id: string, updates: Partial<EmployeeDependent>) {
  const { data, error } = await supabase
    .from('employee_dependents')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as EmployeeDependent
}

export async function deleteDependent(id: string) {
  const { error } = await supabase
    .from('employee_dependents')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ============================================================================
// NOMINEES
// ============================================================================

export async function getNominees(employeeId: string) {
  const { data, error } = await supabase
    .from('employee_nominees')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at')
  if (error) throw error
  return data as EmployeeNominee[]
}

export async function createNominee(nominee: Partial<EmployeeNominee>) {
  const { data, error } = await supabase
    .from('employee_nominees')
    .insert(nominee)
    .select()
    .single()
  if (error) throw error
  return data as EmployeeNominee
}

export async function updateNominee(id: string, updates: Partial<EmployeeNominee>) {
  const { data, error } = await supabase
    .from('employee_nominees')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as EmployeeNominee
}

export async function deleteNominee(id: string) {
  const { error } = await supabase
    .from('employee_nominees')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ============================================================================
// WORK PROFILES (Promotion / Transfer / Redesignation history)
// ============================================================================

export async function getWorkProfiles(employeeId: string) {
  const { data, error } = await supabase
    .from('employee_work_profiles')
    .select(`
      *,
      department:departments(id, name),
      designation:designations(id, title),
      reporting_manager:employees!employee_work_profiles_reporting_manager_id_fkey(id, first_name, last_name)
    `)
    .eq('employee_id', employeeId)
    .order('effective_from', { ascending: false })
  if (error) throw error
  return data
}

export async function createWorkProfile(
  profile: Partial<EmployeeWorkProfile>,
  orgHistory?: Partial<EmployeeOrgHistory>
) {
  // Mark previous current profile as not current
  if (profile.employee_id) {
    await supabase
      .from('employee_work_profiles')
      .update({ is_current: false, effective_to: profile.effective_from || new Date().toISOString().split('T')[0] })
      .eq('employee_id', profile.employee_id)
      .eq('is_current', true)
  }

  const { data, error } = await supabase
    .from('employee_work_profiles')
    .insert({ ...profile, is_current: true })
    .select()
    .single()
  if (error) throw error

  // Also update the employee's current assignment fields
  if (profile.employee_id) {
    const empUpdate: Record<string, unknown> = {}
    if (profile.department_id) empUpdate.department_id = profile.department_id
    if (profile.designation_id) empUpdate.designation_id = profile.designation_id
    if (profile.reporting_manager_id) empUpdate.reporting_manager_id = profile.reporting_manager_id
    if (profile.employment_type) empUpdate.employment_type = profile.employment_type

    if (Object.keys(empUpdate).length > 0) {
      await supabase
        .from('employees')
        .update(empUpdate)
        .eq('id', profile.employee_id)
    }
  }

  // Log org history if provided
  if (orgHistory && orgHistory.organization_id) {
    await supabase
      .from('employee_org_history')
      .insert(orgHistory)
  }

  return data as EmployeeWorkProfile
}

// ============================================================================
// EXIT RECORDS
// ============================================================================

export async function getExitRecord(employeeId: string) {
  const { data, error } = await supabase
    .from('employee_exit_records')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as EmployeeExitRecord | null
}

export async function createExitRecord(record: Partial<EmployeeExitRecord>) {
  const { data, error } = await supabase
    .from('employee_exit_records')
    .insert(record)
    .select()
    .single()
  if (error) throw error

  // Update employee status
  if (record.employee_id) {
    const newStatus = record.exit_type === 'absconding' ? 'absconding' : 'on_notice'
    await supabase
      .from('employees')
      .update({ status: newStatus })
      .eq('id', record.employee_id)

    // Log status change
    if (record.organization_id) {
      await supabase
        .from('employee_status_history')
        .insert({
          organization_id: record.organization_id,
          employee_id: record.employee_id,
          previous_status: 'active',
          new_status: newStatus,
          reason: record.exit_reason || `Exit initiated: ${record.exit_type}`,
          changed_by: record.initiated_by,
        })
    }
  }

  return data as EmployeeExitRecord
}

export async function updateExitRecord(id: string, updates: Partial<EmployeeExitRecord>) {
  const { data, error } = await supabase
    .from('employee_exit_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as EmployeeExitRecord
}

// ============================================================================
// STATUS HISTORY (read-only — auto-logged by exit/promotion operations)
// ============================================================================

export async function getStatusHistory(employeeId: string) {
  const { data, error } = await supabase
    .from('employee_status_history')
    .select('*')
    .eq('employee_id', employeeId)
    .order('changed_on', { ascending: false })
  if (error) throw error
  return data as EmployeeStatusHistory[]
}

// ============================================================================
// ORG HISTORY (read-only — auto-logged by work profile changes)
// ============================================================================

export async function getOrgHistory(employeeId: string) {
  const { data, error } = await supabase
    .from('employee_org_history')
    .select(`
      *,
      old_department:departments!employee_org_history_old_department_id_fkey(id, name),
      new_department:departments!employee_org_history_new_department_id_fkey(id, name),
      old_designation:designations!employee_org_history_old_designation_id_fkey(id, title),
      new_designation:designations!employee_org_history_new_designation_id_fkey(id, title)
    `)
    .eq('employee_id', employeeId)
    .order('effective_from', { ascending: false })
  if (error) throw error
  return data
}

// ============================================================================
// EMPLOYEE DOCUMENTS
// ============================================================================

export async function getEmployeeDocuments(employeeId: string) {
  const { data, error } = await supabase
    .from('employee_documents')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as EmployeeDocument[]
}

export async function createEmployeeDocument(doc: Partial<EmployeeDocument>) {
  const { data, error } = await supabase
    .from('employee_documents')
    .insert(doc)
    .select()
    .single()
  if (error) throw error
  return data as EmployeeDocument
}

export async function updateEmployeeDocument(id: string, updates: Partial<EmployeeDocument>) {
  const { data, error } = await supabase
    .from('employee_documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as EmployeeDocument
}

export async function deleteEmployeeDocument(id: string) {
  const { error } = await supabase
    .from('employee_documents')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Previous Work Experience ─────────────────────────────────────────

export async function getPreviousExperience(employeeId: string) {
  const { data, error } = await supabase
    .from('employee_previous_experience')
    .select('*')
    .eq('employee_id', employeeId)
    .order('start_date', { ascending: false })
  if (error) throw error
  return data as EmployeePreviousExperience[]
}

export async function createPreviousExperience(exp: Partial<EmployeePreviousExperience>) {
  const { data, error } = await supabase
    .from('employee_previous_experience')
    .insert(exp)
    .select()
    .single()
  if (error) throw error
  return data as EmployeePreviousExperience
}

export async function updatePreviousExperience(id: string, updates: Partial<EmployeePreviousExperience>) {
  const { data, error } = await supabase
    .from('employee_previous_experience')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as EmployeePreviousExperience
}

export async function deletePreviousExperience(id: string) {
  const { error } = await supabase
    .from('employee_previous_experience')
    .delete()
    .eq('id', id)
  if (error) throw error
}
