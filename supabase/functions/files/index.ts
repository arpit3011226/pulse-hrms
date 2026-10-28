// Files, backed by Azure Blob Storage.
// Deploy: supabase functions deploy files
//
// ─────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS
//
// Supabase Storage cannot write to Azure Blob. Its file backend wants
// extended attributes that an Azure Files share may not provide, and the
// other way round adds a container to run and watch. Talking to Blob
// directly removes both problems, and brings soft delete and backups for
// well under a dollar a month at this size.
//
// WHAT IT DELIBERATELY DOES NOT DO
//
// It does not decide who may touch a file. Those rules were twelve row-level
// security policies on storage.objects; they are now one Postgres function,
// `can_access_file(bucket, path, intent)`, added in migration 00091. This
// asks that question with the CALLER'S OWN token and does as it is told.
//
// Writing the rules here instead would have put them in TypeScript, out of
// reach of every check that currently proves them, and left two copies to
// drift. QA/scripts/file_access_guard.sh covers all three buckets, both
// directions and the path tricks — 24 checks. None of that would reach a
// rule written in this file.
//
// ─────────────────────────────────────────────────────────────────────────
// API
//
//   POST { action: 'upload', bucket, path, contentType }  → { uploadUrl }
//   POST { action: 'link',   bucket, path }               → { url }  10 min
//   POST { action: 'delete', bucket, path }               → { deleted }
//
// Upload hands back a short-lived write URL rather than streaming the bytes
// through this function: the browser PUTs straight to Blob. One less hop,
// no size limit to tune, and the file never passes through a log.
//
// ─────────────────────────────────────────────────────────────────────────
// SETTINGS
//
//   AZURE_STORAGE_ACCOUNT   the account name
//   AZURE_STORAGE_KEY       one of its access keys, base64
//   SUPABASE_URL / SUPABASE_ANON_KEY   to check the caller's token
//
// The account key never leaves this function. The browser only ever sees a
// URL that expires.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ACCOUNT = Deno.env.get('AZURE_STORAGE_ACCOUNT') ?? ''
const KEY = Deno.env.get('AZURE_STORAGE_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

/** The three containers, named as the application already names them. */
const BUCKETS = new Set([
  'employee-documents',
  'candidate-documents',
  'reimbursement-receipts',
])

const READ_MINUTES = 10
const WRITE_MINUTES = 10

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

// ── Signing ───────────────────────────────────────────────────────────────
//
// A service SAS is an HMAC-SHA256 over a string whose field order is fixed by
// the Azure specification. The order is not negotiable and a wrong one fails
// with a signature mismatch that says nothing useful, so it is written out
// field by field below rather than built in a loop.

async function hmacSha256(keyBase64: string, message: string): Promise<string> {
  const raw = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

function isoMinutes(minutes: number): string {
  // Starts a little in the past, so a clock a few seconds out does not reject
  // a link the moment it is issued.
  const d = new Date(Date.now() + minutes * 60_000)
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function isoAgo(minutes: number): string {
  const d = new Date(Date.now() - minutes * 60_000)
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/**
 * A URL that works for a few minutes and then does not.
 *
 * `permissions` is 'r' to read or 'cw' to create and write.
 */
async function sasUrl(
  container: string,
  blob: string,
  permissions: string,
  minutes: number,
  contentType?: string
): Promise<string> {
  const start = isoAgo(5)
  const expiry = isoMinutes(minutes)
  const version = '2021-08-06'
  const resource = 'b'
  const canonical = `/blob/${ACCOUNT}/${container}/${blob}`

  // Field order per the Azure service SAS specification. Do not reorder.
  const stringToSign = [
    permissions,
    start,
    expiry,
    canonical,
    '',            // signed identifier
    '',            // signed IP
    'https',       // protocol
    version,
    resource,
    '',            // signed snapshot time
    '',            // signed encryption scope
    '',            // rscc  cache-control
    '',            // rscd  content-disposition
    '',            // rsce  content-encoding
    '',            // rscl  content-language
    contentType ?? '', // rsct content-type
  ].join('\n')

  const sig = await hmacSha256(KEY, stringToSign)

  const qs = new URLSearchParams({
    sp: permissions,
    st: start,
    se: expiry,
    spr: 'https',
    sv: version,
    sr: resource,
    sig,
  })
  if (contentType) qs.set('rsct', contentType)

  return `https://${ACCOUNT}.blob.core.windows.net/${container}/${blob}?${qs}`
}

// ── The function ──────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!ACCOUNT || !KEY) {
      return json({ error: 'Storage is not configured on this deployment.' }, 500)
    }

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim()
    if (!jwt) return json({ error: 'Not signed in' }, 401)

    // The caller's own token, not the service key. Everything below is
    // decided as them.
    const asCaller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    })

    const { data: who, error: whoErr } = await asCaller.auth.getUser(jwt)
    if (whoErr || !who.user) return json({ error: 'Not signed in' }, 401)

    const { action, bucket, path, contentType } = (await req.json()) as {
      action?: string; bucket?: string; path?: string; contentType?: string
    }

    if (!action || !bucket || !path) {
      return json({ error: 'action, bucket and path are all required' }, 400)
    }
    if (!BUCKETS.has(bucket)) {
      return json({ error: 'No such container' }, 400)
    }

    const intent = action === 'link' ? 'read' : action === 'upload' ? 'write' : 'delete'

    // The one question that matters, answered by the database.
    const { data: allowed, error: ruleErr } = await asCaller.rpc('can_access_file', {
      p_bucket: bucket,
      p_path: path,
      p_intent: intent,
    })
    if (ruleErr) return json({ error: `Could not check access: ${ruleErr.message}` }, 500)
    if (allowed !== true) {
      // Deliberately the same answer whichever way it failed. Saying "that
      // file is not yours" rather than "no such file" tells somebody that
      // the file exists.
      return json({ error: 'Not allowed' }, 403)
    }

    if (action === 'link') {
      return json({ url: await sasUrl(bucket, path, 'r', READ_MINUTES) })
    }

    if (action === 'upload') {
      return json({
        uploadUrl: await sasUrl(bucket, path, 'cw', WRITE_MINUTES, contentType),
        headers: {
          'x-ms-blob-type': 'BlockBlob',
          ...(contentType ? { 'Content-Type': contentType } : {}),
        },
      })
    }

    if (action === 'delete') {
      const url = await sasUrl(bucket, path, 'd', 2)
      const res = await fetch(url, { method: 'DELETE' })
      // 404 means it is already gone, which is the state the caller wanted.
      if (!res.ok && res.status !== 404) {
        return json({ error: `Could not delete: ${res.status}` }, 400)
      }
      return json({ deleted: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Something went wrong' }, 500)
  }
})
