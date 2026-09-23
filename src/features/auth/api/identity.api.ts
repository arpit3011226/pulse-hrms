import { supabase } from '@/lib/supabase'
import type { AppRole } from '@/types/database.types'

/**
 * F43 — Unified identity.
 *
 * One person keeps one identity across the whole journey:
 *   candidate -> employee -> alumnus
 *
 * The anchor is their personal email, because that is the only address they
 * keep throughout. The work email belongs to the employment, not the person.
 */

export interface PersonContext {
  profile_id: string
  personal_email: string | null
  role: AppRole
  employee_id: string | null
  employee_status: string | null
  candidate_id: string | null
  is_employee: boolean
  is_alumni: boolean
  is_candidate: boolean
}

/** Resolve who the signed-in person is, across every stage of the journey. */
export async function getPersonContext(): Promise<PersonContext | null> {
  const { data, error } = await supabase.rpc('get_person_context')
  if (error) throw error
  const rows = (data ?? []) as PersonContext[]
  return rows[0] ?? null
}

/**
 * Find an existing login by personal email.
 *
 * Used when converting a candidate to an employee so we reuse the identity
 * they already have rather than creating a second one for the same person.
 */
export async function findProfileByPersonalEmail(email: string): Promise<string | null> {
  if (!email.trim()) return null
  const { data, error } = await supabase.rpc('find_profile_by_personal_email', {
    p_email: email.trim(),
  })
  if (error) throw error
  return (data as string | null) ?? null
}
