// Supabase Edge Function: set a password on an existing login.
// Deploy: supabase functions deploy set-password
//
// Why this exists: the demo logins use a made-up domain, so no email ever
// reaches them and "Forgot password" can never work. Without this, a demo
// password that was mistyped or lost leaves the account stuck for good.
//
// It is also the honest answer for a real person who has lost access to their
// work email — HR resets it and hands it over once, rather than nobody being
// able to help.
//
// Only a super admin may call it, and only for someone in their own
// organisation. Setting a password needs the service role key, which must
// never reach the browser — hence a function rather than a client call.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Shortest password we will set on someone's behalf. */
const MIN_PASSWORD_LENGTH = 12

interface SetPasswordRequest {
  /** Who to set it for. */
  email: string
  password: string
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

    const caller = createClient(SUPABASE_URL, ANON_KEY)
    const { data: callerAuth, error: callerErr } = await caller.auth.getUser(jwt)
    if (callerErr || !callerAuth.user) return json({ error: 'Not signed in' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', callerAuth.user.id)
      .single()

    // Deliberately narrower than create-user. Handing someone a working
    // password is a bigger thing than inviting them to choose their own.
    if (!callerProfile || callerProfile.role !== 'super_admin') {
      return json({ error: 'Only a super admin may reset a password' }, 403)
    }
    if (!callerProfile.organization_id) {
      return json({ error: 'Your account is not linked to an organisation' }, 400)
    }

    const body = (await req.json()) as SetPasswordRequest
    const email = (body.email ?? '').trim().toLowerCase()
    const password = (body.password ?? '').trim()

    if (!email) return json({ error: 'An email address is required' }, 400)
    if (password.length < MIN_PASSWORD_LENGTH) {
      return json({ error: `The password must be at least ${MIN_PASSWORD_LENGTH} characters` }, 400)
    }

    const { data: target } = await admin
      .from('profiles')
      .select('id, organization_id')
      .eq('email', email)
      .maybeSingle()

    if (!target) return json({ error: 'No login exists for that email address' }, 404)

    // Stops a super admin in one organisation reaching into another.
    if (target.organization_id !== callerProfile.organization_id) {
      return json({ error: 'That login belongs to another organisation' }, 403)
    }

    const { error: updateErr } = await admin.auth.admin.updateUserById(target.id, {
      password,
      // A login that was never opened is confirmed here, so it can be used at once.
      email_confirm: true,
    })
    if (updateErr) return json({ error: updateErr.message }, 400)

    return json({ user_id: target.id, email, password_set: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
