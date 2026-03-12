import { supabase } from '@/lib/supabase'
import type { Department, Designation } from '@/types/database.types'

export async function getDepartments(orgId: string) {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data as Department[]
}

export async function createDepartment(department: Partial<Department>) {
  const { data, error } = await supabase
    .from('departments')
    .insert(department)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateDepartment(id: string, updates: Partial<Department>) {
  const { data, error } = await supabase
    .from('departments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteDepartment(id: string) {
  const { error } = await supabase
    .from('departments')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}

export async function getDesignations(orgId: string) {
  const { data, error } = await supabase
    .from('designations')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('level')

  if (error) throw error
  return data as Designation[]
}

export async function createDesignation(designation: Partial<Designation>) {
  const { data, error } = await supabase
    .from('designations')
    .insert(designation)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateDesignation(id: string, updates: Partial<Designation>) {
  const { data, error } = await supabase
    .from('designations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteDesignation(id: string) {
  const { error } = await supabase
    .from('designations')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}
