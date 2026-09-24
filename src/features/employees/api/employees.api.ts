import { supabase } from '@/lib/supabase'
import type { Employee, EmployeePersonal, EmployeeStatutory } from '@/types/database.types'

export interface EmployeeFilters {
  search?: string
  department?: string
  status?: string
}

export async function getEmployees(orgId: string, filters?: EmployeeFilters) {
  let query = supabase
    .from('employees')
    .select('*, department:departments!department_id(id, name), designation:designations!designation_id(id, title)')
    .eq('organization_id', orgId)

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.department) {
    query = query.eq('department_id', filters.department)
  }
  if (filters?.search) {
    query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function getEmployee(id: string) {
  // The two private records come back as nested objects. Anyone without the
  // right to read them simply gets null, so the screen degrades rather than
  // failing — see migration 00045.
  const { data, error } = await supabase
    .from('employees')
    .select('*, department:departments!department_id(id, name), designation:designations!designation_id(id, title), statutory:employee_statutory(*), personal:employee_personal(*)')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

/**
 * Government identifiers and bank details live in their own table with their own
 * policy, so they are written separately from the directory record.
 */
export async function upsertEmployeeStatutory(
  employeeId: string,
  organizationId: string,
  updates: Partial<EmployeeStatutory>
) {
  const { error } = await supabase
    .from('employee_statutory')
    .upsert(
      { ...updates, employee_id: employeeId, organization_id: organizationId },
      { onConflict: 'employee_id' }
    )
  if (error) throw new Error(error.message)
}

export async function upsertEmployeePersonal(
  employeeId: string,
  organizationId: string,
  updates: Partial<EmployeePersonal>
) {
  const { error } = await supabase
    .from('employee_personal')
    .upsert(
      { ...updates, employee_id: employeeId, organization_id: organizationId },
      { onConflict: 'employee_id' }
    )
  if (error) throw new Error(error.message)
}

export async function createEmployee(employee: Partial<Employee>) {
  const { data, error } = await supabase
    .from('employees')
    .insert(employee)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateEmployee(id: string, updates: Partial<Employee>) {
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteEmployee(id: string) {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

/** Generate the next employee code like EMP-0001, EMP-0002, etc. */
export async function generateNextEmployeeCode(orgId: string): Promise<string> {
  const { data, error } = await supabase
    .from('employees')
    .select('employee_code')
    .eq('organization_id', orgId)
    .not('employee_code', 'is', null)
    .ilike('employee_code', 'EMP-%')
    .order('employee_code', { ascending: false })
    .limit(1)

  if (error) throw new Error(error.message)

  let nextNum = 1
  if (data && data.length > 0 && data[0].employee_code) {
    const match = data[0].employee_code.match(/EMP-(\d+)/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }

  // Also check total count as fallback to avoid collisions
  const { count } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)

  if (count && count >= nextNum) nextNum = count + 1

  return `EMP-${String(nextNum).padStart(4, '0')}`
}

export async function getEmployeeCount(orgId: string) {
  const { count, error } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('status', 'active')

  if (error) throw new Error(error.message)
  return count ?? 0
}
