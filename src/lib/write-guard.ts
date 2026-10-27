import { supabase } from '@/lib/supabase'

/**
 * A write that tells you the truth about whether it happened.
 *
 * Row-level security does not refuse an UPDATE it disallows. It narrows it
 * to no rows and returns success. So this, run by somebody the policy does
 * not permit:
 *
 *     await supabase.from('organizations').update({ … }).eq('id', orgId)
 *     // error === null
 *
 * is indistinguishable from a write that worked, and the screen says
 * "Saved". Four defects in this project have had exactly that shape —
 * QA-24, QA-29, QA-34 and QA-47 — and each one was reported as "it says it
 * worked but nothing changed".
 *
 * WHY THIS, AND NOT LOCKING DOWN THE PERMISSIONS SCREEN
 *
 * Roles and Permissions can grant HR a permission that RLS will not honour
 * — `org_settings: manage`, say, when only a super admin may write
 * `organizations`. The other way to fix that is to stop the screen offering
 * combinations the database refuses. That means a second hard-coded copy of
 * what RLS allows, which is a third source of truth that will drift from the
 * other two, and it takes away a capability rather than fixing anything.
 *
 * This takes nothing away. Grant whatever you like; if the database declines
 * it, the person is told plainly instead of being lied to.
 *
 * ── A TRAP TO KNOW ABOUT ────────────────────────────────────────────────
 *
 * `.select()` after a write asks PostgREST for the rows back, which applies
 * the SELECT policy as well as the write policy. Where somebody may write a
 * row but not read it, adding `.select()` turns a working write into a 403
 * and rolls the whole thing back. That is QA-29 exactly: notifications could
 * be written for a colleague and not read back, so every one was discarded.
 *
 * So this is for writes where the writer can also read the row — which is
 * most of them, and all of the restricted tables it is used on. It is not a
 * blanket wrapper to put round all 144 update calls in the codebase.
 */

export interface GuardedWriteOptions {
  /** Shown to the person when the database declined the write. */
  deniedMessage?: string
}

type WriteResult<T> = { data: T[] | null; error: { message: string } | null }

/**
 * Run a write that returns its rows, and complain when none come back.
 *
 * Pass the builder with `.select(...)` already on it, so the caller decides
 * which columns to ask for.
 */
export async function mustWrite<T>(
  write: PromiseLike<WriteResult<T>>,
  options: GuardedWriteOptions = {}
): Promise<T[]> {
  const { data, error } = await write

  if (error) throw new Error(error.message)

  if (!data || data.length === 0) {
    throw new Error(
      options.deniedMessage ??
        'That did not save. Your account does not have permission to change this, ' +
          'even though the screen offered it. Please ask a super admin.'
    )
  }

  return data
}

/** The same, for a write that should touch exactly one row. */
export async function mustWriteOne<T>(
  write: PromiseLike<WriteResult<T>>,
  options: GuardedWriteOptions = {}
): Promise<T> {
  const rows = await mustWrite(write, options)
  return rows[0]
}

export { supabase }
