// Supabase Edge Function: hand an alumnus a way back in.
// Deploy: supabase functions deploy issue-reactivation-link
//
// ─────────────────────────────────────────────────────────────────────────────
// THIS IS THE ADAPTER. It is the only part of the identity work that knows
// which authentication service is underneath, and it is deliberately thin.
//
// Pulse is moving to Azure on plain Postgres. Everything else about identity —
// the roles, the transitions, who may do what, the audit trail — lives in the
// database in migration 00074 and moves across untouched. Rewriting this one
// file is the whole of the authentication port.
//
// The contract, for whoever rewrites it:
//
//   in   { profile_id }           caller must be HR or a super admin, same org
//   does 1. point the login at the person's personal address
//        2. hand back a link they can use to set a password
//        3. record both in identity_events
//   out  { email, link }
//
// ─────────────────────────────────────────────────────────────────────────────
// Why it exists (QA-39): when somebody leaves, their role becomes `alumni`,
// which blocks company sign-on by design. But an employee who joined through
// Google never had a password, and their work address stops working the day
// they leave. Nothing issued a link. Every single leaver was locked out, and
// the exit screen reported the exit as complete.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim()
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

    if (!callerProfile || !['hr_admin', 'super_admin'].includes(callerProfile.role)) {
      return json({ error: 'Only HR or a super admin may do this' }, 403)
    }

    const { profile_id, redirect_to } = (await req.json()) as {
      profile_id?: string
      redirect_to?: string
    }
    if (!profile_id) return json({ error: 'profile_id is required' }, 400)

    const { data: target } = await admin
      .from('profiles')
      .select('id, role, email, personal_email, organization_id')
      .eq('id', profile_id)
      .single()

    if (!target) return json({ error: 'No such person' }, 404)
    if (target.organization_id !== callerProfile.organization_id) {
      return json({ error: 'That person is not in your organisation' }, 403)
    }
    if (target.role !== 'alumni') {
      return json({ error: 'This is only for people who have left' }, 400)
    }

    // The personal address is the only one they still have. Without it there
    // is nothing to send, and guessing is worse than saying so.
    const personal = (target.personal_email ?? '').trim()
    if (!personal) {
      return json(
        { error: 'No personal email on record. Add one first, then issue the link.' },
        400
      )
    }

    const previousLogin = target.email

    // Point the login at the personal address. Confirmed straight away: this
    // is HR acting on a person they have just offboarded, not a stranger
    // claiming an address, and an unconfirmed address cannot receive a
    // recovery link.
    if (previousLogin?.toLowerCase() !== personal.toLowerCase()) {
      const { error: updErr } = await admin.auth.admin.updateUserById(profile_id, {
        email: personal,
        email_confirm: true,
      })
      if (updErr) return json({ error: `Could not move the login: ${updErr.message}` }, 400)

      await admin.from('profiles').update({ email: personal }).eq('id', profile_id)

      await admin.from('identity_events').insert({
        organization_id: target.organization_id,
        profile_id,
        event: 'login_email_changed',
        old_value: previousLogin,
        new_value: personal,
        actor_profile_id: callerAuth.user.id,
        note: 'Moved to the personal address on leaving.',
      })
    }

    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: personal,
      options: { redirectTo: redirect_to },
    })
    if (linkErr) return json({ error: `Could not make the link: ${linkErr.message}` }, 400)

    await admin.from('identity_events').insert({
      organization_id: target.organization_id,
      profile_id,
      event: 'reactivation_link_issued',
      new_value: personal,
      actor_profile_id: callerAuth.user.id,
    })

    return json({
      email: personal,
      link: link?.properties?.action_link ?? null,
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Something went wrong' }, 500)
  }
})
