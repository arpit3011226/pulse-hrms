import { supabase } from '@/lib/supabase'

/**
 * Telling people that something happened.
 *
 * Goes through database functions rather than inserting here, because to
 * notify HR you must first know who HR is — and a candidate cannot read
 * anybody's profile but their own. The database delivers by role so the
 * staff list stays private while a candidate's upload still reaches the
 * right people.
 *
 * Never throws. A notification that fails to send must not undo the thing it
 * was reporting: losing an uploaded document because we could not tell
 * somebody about it would be far worse than the silence. Failures are logged
 * and swallowed, which is the same bargain the resignation flow makes — with
 * the difference that QA-29 is fixed, so they now actually arrive.
 */

type Notify = {
  title: string
  message: string
  type?: string
  referenceId?: string | null
  referenceType?: string | null
}

export async function notifyPerson(profileId: string | null | undefined, n: Notify) {
  if (!profileId) return
  try {
    const { error } = await supabase.rpc('notify_profile', {
      p_profile: profileId,
      p_title: n.title,
      p_message: n.message,
      p_type: n.type ?? 'info',
      p_reference_id: n.referenceId ?? null,
      p_reference_type: n.referenceType ?? null,
    })
    if (error) console.warn('notifyPerson failed:', error.message)
  } catch (err) {
    console.warn('notifyPerson threw:', err)
  }
}

/** Staff roles only — the database refuses anything else. */
export async function notifyRoles(roles: string[], n: Notify) {
  if (roles.length === 0) return
  try {
    const { error } = await supabase.rpc('notify_roles', {
      p_roles: roles,
      p_title: n.title,
      p_message: n.message,
      p_type: n.type ?? 'info',
      p_reference_id: n.referenceId ?? null,
      p_reference_type: n.referenceType ?? null,
    })
    if (error) console.warn('notifyRoles failed:', error.message)
  } catch (err) {
    console.warn('notifyRoles threw:', err)
  }
}

export const HR_AND_ADMIN = ['hr_admin', 'super_admin']
