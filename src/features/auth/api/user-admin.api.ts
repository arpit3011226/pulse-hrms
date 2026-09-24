import { supabase } from '@/lib/supabase'

/**
 * Creating a login needs the service role key, so it happens in the create-user
 * edge function rather than here. This is only the call.
 */
export interface CreateLoginInput {
  email: string
  first_name?: string
  last_name?: string
  role: string
  employee_id?: string | null
  /** Links the login to a candidate record, for the application portal. */
  candidate_id?: string | null
  personal_email?: string | null
}

export interface CreateLoginResult {
  user_id: string
  email: string
  /** Link the person uses to set their own password. Null if it could not be made. */
  set_password_link: string | null
  /** Why the link could not be made, when it could not. */
  link_error: string | null
  /** True when an existing login was attached rather than a new one created. */
  linked_existing?: boolean
}

export async function createLogin(input: CreateLoginInput): Promise<CreateLoginResult> {
  const { data, error } = await supabase.functions.invoke('create-user', {
    // So the set-password link brings them back to this deployment, not to
    // whatever Site URL happens to be configured on the project.
    body: { ...input, redirect_to: `${window.location.origin}/login` },
  })
  if (error) {
    // The function puts a readable reason in the body; surface that rather than
    // "Edge Function returned a non-2xx status code".
    let message = error.message
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = await ctx.json()
        if (body?.error) message = body.error
      } catch {
        // keep the original message
      }
    }
    throw new Error(message)
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error)
  return data as CreateLoginResult
}
