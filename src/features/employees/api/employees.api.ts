import { supabase } from '@/lib/supabase'
import type { Employee } from '@/types/database.types'

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
  const { data, error } = await supabase
    .from('employees')
    .select('*, department:departments!department_id(id, name), designation:designations!designation_id(id, title)')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
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

export async function getEmployeeCount(orgId: string) {
  const { count, error } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('status', 'active')

  if (error) throw new Error(error.message)
  return count ?? 0
}
