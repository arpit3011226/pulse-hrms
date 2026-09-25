// Supabase Edge Function: create a login for an employee or an alumnus.
// Deploy: supabase functions deploy create-user
//
// Nobody can sign themselves up. Logins are created here, and only by someone
// who already holds an HR, admin or leadership role in the same organisation.
// Creating an auth user needs the service role key, which must never reach the
// browser — hence a function rather than a client call.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Roles allowed to create a login for someone else. */
const ROLES_THAT_MAY_CREATE = ['super_admin', 'hr_admin', 'leadership']

/** Roles a new login may be given. HR and leadership cannot mint a super admin. */
const ASSIGNABLE_ROLES = ['hr_admin', 'payroll_admin', 'manager', 'leadership', 'employee', 'alumni', 'candidate']

/**
 * A super admin may create another super admin. That is a sideways move, not an
 * escalation — whoever is already a super admin can do everything anyway — and
 * it is how the demo set gets its admin login. Everyone else is held to the
 * list above, so a stolen HR account still cannot promote itself.
 */
function assignableRolesFor(callerRole: string): string[] {
  return callerRole === 'super_admin' ? [...ASSIGNABLE_ROLES, 'super_admin'] : ASSIGNABLE_ROLES
}

/** Shortest password we will set on someone's behalf. */
const MIN_PASSWORD_LENGTH = 12

interface CreateUserRequest {
  email: string
  first_name?: string
  last_name?: string
  role: string
  /** Employee this login belongs to, when there is one. */
  employee_id?: string | null
  /**
   * Candidate this login belongs to, for the application portal. A candidate is
   * not an employee, so they are linked through the candidates table instead.
   */
  candidate_id?: string | null
  /** Identity anchor that survives leaving the company. */
  personal_email?: string | null
  /**
   * Where the set-password link should land. Supabase only honours URLs on the
   * project's redirect allow-list, so this cannot be turned into an open redirect.
   */
  redirect_to?: string | null
  /**
   * Set this password instead of sending a set-password link.
   *
   * Only a super admin may pass it, and it exists for seeded demo logins that
   * have to be handed to a tester ready to use. Every real person still gets a
   * link and chooses their own password, so the company never holds one it did
   * not need to.
   */
  password?: string | null
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '').trim()
    if (!jwt) return json({ error: 'Not signed in' }, 401)

    // Who is asking?
    const caller = createClient(SUPABASE_URL, ANON_KEY)
    const { data: callerAuth, error: callerErr } = await caller.auth.getUser(jwt)
    if (callerErr || !callerAuth.user) return json({ error: 'Not signed in' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', callerAuth.user.id)
      .single()

    if (!callerProfile || !ROLES_THAT_MAY_CREATE.includes(callerProfile.role)) {
      return json({ error: 'You do not have permission to create logins' }, 403)
    }
    if (!callerProfile.organization_id) {
      return json({ error: 'Your account is not linked to an organisation' }, 400)
    }

    const body = (await req.json()) as CreateUserRequest
    const email = (body.email ?? '').trim().toLowerCase()
    if (!email) return json({ error: 'An email address is required' }, 400)
    if (!assignableRolesFor(callerProfile.role).includes(body.role)) {
      return json({ error: `Role "${body.role}" cannot be assigned` }, 400)
    }

    const password = (body.password ?? '').trim()
    if (password) {
      if (callerProfile.role !== 'super_admin') {
        return json({ error: 'Only a super admin may set a password directly' }, 403)
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        return json(
          { error: `A password set this way must be at least ${MIN_PASSWORD_LENGTH} characters` },
          400
        )
      }
    }

    // Reuse the identity if this person already has one, rather than creating a
    // second login for the same human.
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (existing) {
      // A login already exists. If it is not yet attached to an employee record and
      // we were told which one, attach it rather than making HR give up.
      if (body.candidate_id) {
        const { data: candLinked } = await admin
          .from('candidates')
          .select('id')
          .eq('profile_id', existing.id)
          .maybeSingle()
        if (!candLinked) {
          const { error: linkCandErr } = await admin
            .from('candidates')
            .update({ profile_id: existing.id })
            .eq('id', body.candidate_id)
            .eq('organization_id', callerProfile.organization_id)
          if (linkCandErr) return json({ error: linkCandErr.message }, 400)
          return json({
            user_id: existing.id, email, set_password_link: null,
            link_error: null, linked_existing: true,
          })
        }
      }

      if (body.employee_id) {
        const { data: alreadyLinked } = await admin
          .from('employees')
          .select('id')
          .eq('profile_id', existing.id)
          .maybeSingle()

        if (!alreadyLinked) {
          const { error: linkExistingErr } = await admin
            .from('employees')
            .update({ profile_id: existing.id })
            .eq('id', body.employee_id)
            .eq('organization_id', callerProfile.organization_id)
          if (linkExistingErr) return json({ error: linkExistingErr.message }, 400)

          return json({
            user_id: existing.id,
            email,
            set_password_link: null,
            link_error: null,
            linked_existing: true,
          })
        }
      }
      return json({ error: 'A login already exists for that email address' }, 409)
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      // Empty string would be rejected, so the field is only sent when set.
      ...(password ? { password } : {}),
      user_metadata: {
        first_name: body.first_name ?? '',
        last_name: body.last_name ?? '',
      },
    })
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? 'Could not create the login' }, 400)
    }

    // handle_new_user() has already made the profile row; fill in what only we know.
    const { error: profileErr } = await admin
      .from('profiles')
      .update({
        organization_id: callerProfile.organization_id,
        role: body.role,
        personal_email: body.personal_email ?? null,
        first_name: body.first_name ?? '',
        last_name: body.last_name ?? '',
      })
      .eq('id', created.user.id)

    if (profileErr) {
      // Do not leave a half-made login behind.
      await admin.auth.admin.deleteUser(created.user.id)
      return json({ error: profileErr.message }, 400)
    }

    if (body.employee_id) {
      const { error: linkErr } = await admin
        .from('employees')
        .update({ profile_id: created.user.id })
        .eq('id', body.employee_id)
        .eq('organization_id', callerProfile.organization_id)
      if (linkErr) {
        await admin.auth.admin.deleteUser(created.user.id)
        return json({ error: linkErr.message }, 400)
      }
    }

    if (body.candidate_id) {
      const { error: candErr } = await admin
        .from('candidates')
        .update({ profile_id: created.user.id })
        .eq('id', body.candidate_id)
        .eq('organization_id', callerProfile.organization_id)
      if (candErr) {
        await admin.auth.admin.deleteUser(created.user.id)
        return json({ error: candErr.message }, 400)
      }
    }

    // A login that was given a password needs no link, and issuing one anyway
    // would hand out a way to change that password.
    if (password) {
      return json({
        user_id: created.user.id,
        email,
        set_password_link: null,
        link_error: null,
        password_set: true,
      })
    }

    // The person sets their own password through this link. We never handle it.
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: body.redirect_to ? { redirectTo: body.redirect_to } : undefined,
    })

    return json({
      user_id: created.user.id,
      email,
      set_password_link: linkErr ? null : link?.properties?.action_link ?? null,
      // Surfaced so an admin is told why, instead of being handed nothing.
      link_error: linkErr ? linkErr.message : null,
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
