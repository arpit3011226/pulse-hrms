// Switch the staff over to company sign-on.
// Deploy: supabase functions deploy enable-sso
//
// ─────────────────────────────────────────────────────────────────────────
// WHAT THIS DOES, AND WHY IT IS NOT JUST A FLAG
//
// Marking somebody `login_method = 'sso'` is a label. Their password still
// works, and a working password quietly undoes the whole point of company
// sign-on: that losing the Google account ends access to Pulse.
//
// So this also replaces each person's password with random bytes nobody
// holds. After that, the only way in is Google. That is the part that
// actually enforces it — the check in the browser only tells people which
// button to press.
//
// ─────────────────────────────────────────────────────────────────────────
// THE DANGEROUS PART
//
// If Google then fails — an expired client secret, a redirect URL that no
// longer matches, somebody editing the consent screen — the entire company
// is locked out, on whatever day that happens to be.
//
// So one account always keeps a password: the super admin running this. The
// function refuses to proceed without one. That account is the way back in,
// and whoever holds it should be able to sign in with it today, not in
// principle.
//
// ─────────────────────────────────────────────────────────────────────────
//   POST { dryRun: true }   → what it would do, changing nothing
//   POST { confirm: true }  → does it
//
// Super admin only.

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

/** Random bytes nobody holds, so the password is no longer a way in. */
function unknowablePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(48))
  return btoa(String.fromCharCode(...bytes))
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

    const { data: me } = await admin
      .from('profiles')
      .select('id, role, organization_id, login_method')
      .eq('id', callerAuth.user.id)
      .single()

    if (!me || me.role !== 'super_admin') {
      return json({ error: 'Only a super admin can switch the company to company sign-on' }, 403)
    }
    if (!me.organization_id) {
      return json({ error: 'Your account is not linked to an organisation' }, 400)
    }

    const { dryRun, confirm } = (await req.json().catch(() => ({}))) as {
      dryRun?: boolean; confirm?: boolean
    }

    // Everybody who would move, and everybody who would not, with reasons.
    const { data: staff } = await admin
      .from('profiles')
      .select('id, first_name, last_name, role, sso_email, login_method, is_active')
      .eq('organization_id', me.organization_id)

    const active = (staff ?? []).filter((p) => p.is_active !== false)
    const notStaff = active.filter((p) => ['candidate', 'alumni'].includes(p.role))
    const noWorkEmail = active.filter(
      (p) => !['candidate', 'alumni'].includes(p.role) && !(p.sso_email ?? '').trim()
    )

    // The caller keeps their password. That is the way back in if Google
    // fails, and the reason this cannot lock everybody out.
    const willSwitch = active.filter(
      (p) =>
        !['candidate', 'alumni'].includes(p.role) &&
        (p.sso_email ?? '').trim() &&
        p.id !== me.id
    )

    const summary = {
      willSwitch: willSwitch.map((p) => `${p.first_name} ${p.last_name}`),
      keepsPasswordAsWayBackIn: `${me.id}`,
      skippedNotStaff: notStaff.map((p) => `${p.first_name} ${p.last_name} (${p.role})`),
      blockedNoWorkEmail: noWorkEmail.map((p) => `${p.first_name} ${p.last_name}`),
    }

    if (noWorkEmail.length > 0) {
      return json({
        error:
          `${noWorkEmail.length} member(s) of staff have no work address recorded. ` +
          'Switching now would lock them out of Pulse with no way back. ' +
          'Set their work address first.',
        ...summary,
      }, 400)
    }

    if (dryRun || !confirm) {
      return json({
        dryRun: true,
        message:
          `This would move ${willSwitch.length} people to company sign-on and make their ` +
          'passwords unusable. You would keep yours, as the way back in if Google fails. ' +
          'Send { "confirm": true } to proceed.',
        ...summary,
      })
    }

    let switched = 0
    const failures: string[] = []

    for (const person of willSwitch) {
      // The password first. If the label moved and the password did not, the
      // person would be told to use Google while their password still
      // worked — the exact gap this is closing.
      const { error: pwErr } = await admin.auth.admin.updateUserById(person.id, {
        password: unknowablePassword(),
      })
      if (pwErr) {
        failures.push(`${person.first_name} ${person.last_name}: ${pwErr.message}`)
        continue
      }

      const { error: markErr } = await admin
        .from('profiles')
        .update({ login_method: 'sso' })
        .eq('id', person.id)
      if (markErr) {
        failures.push(`${person.first_name} ${person.last_name}: ${markErr.message}`)
        continue
      }

      await admin.from('identity_events').insert({
        organization_id: me.organization_id,
        profile_id: person.id,
        event: 'login_method_changed',
        old_value: person.login_method ?? 'password',
        new_value: 'sso',
        actor_profile_id: me.id,
        note: 'Switched to company sign-on. Password replaced with random bytes.',
      })

      switched += 1
    }

    // Only now does the organisation say sign-on is live, so a half-finished
    // run does not leave new joiners being marked SSO against a provider
    // that has not been proven.
    if (failures.length === 0) {
      await admin
        .from('organizations')
        .update({ sso_enabled: true })
        .eq('id', me.organization_id)
    }

    return json({
      switched,
      failures,
      ssoEnabled: failures.length === 0,
      keepYourPassword:
        'Your own password still works. Do not lose it — it is the way back in if Google stops working.',
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Something went wrong' }, 500)
  }
})
