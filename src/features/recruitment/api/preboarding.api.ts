import { supabase } from '@/lib/supabase'
import { uploadFile, getSignedUrl, copyBetweenBuckets } from '@/lib/storage'
import { notifyPerson, notifyRoles, HR_AND_ADMIN } from '@/lib/notify'

/**
 * Pre-boarding — what we ask a candidate for before they start.
 *
 * Two gates, because one would stall every hire. Nobody can produce a
 * relieving letter before they have resigned, and nobody resigns without an
 * offer in hand:
 *
 *   before_offer    identity, education, current salary proof
 *   before_joining  relieving letter, experience letter, final payslips
 *
 * File locations are kept as bucket + key, never a URL — Pulse moves to Azure
 * Blob shortly and a stored URL would have to be rewritten on every row.
 */

export const CANDIDATE_BUCKET = 'candidate-documents'
export const EMPLOYEE_BUCKET = 'employee-documents'

export type PreboardingGate = 'before_offer' | 'before_joining'

export interface DocumentRequirement {
  id: string
  organization_id: string
  code: string
  label: string
  description: string | null
  category: string
  gate: PreboardingGate
  is_mandatory: boolean
  guidance: string | null
  is_active: boolean
  sort_order: number
}

export interface PreboardingItem {
  id: string
  organization_id: string
  checklist_id: string
  requirement_id: string | null
  label: string
  guidance: string | null
  is_mandatory: boolean
  status: 'pending' | 'uploaded' | 'verified' | 'rejected'
  storage_bucket: string | null
  storage_path: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  uploaded_at: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  sort_order: number
}

export interface PreboardingChecklist {
  id: string
  organization_id: string
  candidate_id: string
  candidate_application_id: string | null
  gate: PreboardingGate
  status: 'draft' | 'sent' | 'in_progress' | 'submitted' | 'approved'
  due_date: string | null
  sent_at: string | null
  submitted_at: string | null
  reviewed_at: string | null
  notes: string | null
  items?: PreboardingItem[]
  candidate?: { id: string; first_name: string; last_name: string; email: string } | null
}

const CHECKLIST_SELECT =
  '*, items:preboarding_checklist_items(*), ' +
  'candidate:candidates!preboarding_checklists_candidate_id_fkey(id, first_name, last_name, email)'

// ── The catalogue HR maintains ──────────────────────────────────────────────

export async function getDocumentRequirements(orgId: string): Promise<DocumentRequirement[]> {
  const { data, error } = await supabase
    .from('document_requirements')
    .select('*')
    .eq('organization_id', orgId)
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as DocumentRequirement[]
}

export async function saveDocumentRequirement(
  input: Partial<DocumentRequirement> & { organization_id: string; code: string; label: string }
) {
  const { data, error } = await supabase
    .from('document_requirements')
    .upsert(input, { onConflict: 'organization_id,code' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Asking one candidate ────────────────────────────────────────────────────

export async function getChecklistsForCandidate(candidateId: string) {
  const { data, error } = await supabase
    .from('preboarding_checklists')
    .select(CHECKLIST_SELECT)
    .eq('candidate_id', candidateId)
    .order('gate')
  if (error) throw error
  return (data ?? []) as unknown as PreboardingChecklist[]
}

export async function getOpenChecklists(orgId: string) {
  const { data, error } = await supabase
    .from('preboarding_checklists')
    .select(CHECKLIST_SELECT)
    .eq('organization_id', orgId)
    .neq('status', 'approved')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as PreboardingChecklist[]
}

/**
 * Build and send the list for one gate.
 *
 * The label and the guidance are copied onto each row rather than joined.
 * Renaming something in the catalogue two years from now must not rewrite
 * what a particular person was actually asked for.
 */
export async function sendChecklist(input: {
  organization_id: string
  candidate_id: string
  candidate_application_id?: string | null
  gate: PreboardingGate
  due_date?: string | null
  requirement_ids?: string[]
}): Promise<PreboardingChecklist> {
  const all = await getDocumentRequirements(input.organization_id)
  const chosen = all.filter(
    (r) =>
      r.is_active &&
      r.gate === input.gate &&
      (!input.requirement_ids?.length || input.requirement_ids.includes(r.id))
  )

  if (chosen.length === 0) {
    throw new Error('Nothing to ask for at this stage. Add a document to the list first.')
  }

  const { data: checklist, error } = await supabase
    .from('preboarding_checklists')
    .upsert(
      {
        organization_id: input.organization_id,
        candidate_id: input.candidate_id,
        candidate_application_id: input.candidate_application_id ?? null,
        gate: input.gate,
        status: 'sent',
        due_date: input.due_date ?? null,
        sent_at: new Date().toISOString(),
      },
      { onConflict: 'candidate_id,gate' }
    )
    .select()
    .single()
  if (error) throw error

  // Replace only the rows nobody has touched yet, so re-sending a list never
  // throws away a document somebody has already uploaded.
  const { data: existing } = await supabase
    .from('preboarding_checklist_items')
    .select('id, requirement_id, status')
    .eq('checklist_id', checklist.id)

  const keep = new Set(
    (existing ?? [])
      .filter((i) => i.status !== 'pending')
      .map((i) => i.requirement_id as string)
  )
  const stale = (existing ?? []).filter((i) => i.status === 'pending').map((i) => i.id)
  if (stale.length) {
    await supabase.from('preboarding_checklist_items').delete().in('id', stale)
  }

  const rows = chosen
    .filter((r) => !keep.has(r.id))
    .map((r) => ({
      organization_id: input.organization_id,
      checklist_id: checklist.id,
      requirement_id: r.id,
      label: r.label,
      guidance: r.guidance,
      is_mandatory: r.is_mandatory,
      sort_order: r.sort_order,
    }))

  if (rows.length) {
    const { error: itemErr } = await supabase.from('preboarding_checklist_items').insert(rows)
    if (itemErr) throw itemErr
  }

  // The candidate has no reason to keep checking the portal on the off
  // chance. Without this the first they hear of it is a chasing email, which
  // is the thing the portal was meant to replace.
  const { data: cand } = await supabase
    .from('candidates')
    .select('profile_id, first_name')
    .eq('id', input.candidate_id)
    .maybeSingle()

  await notifyPerson(cand?.profile_id, {
    title: 'Some documents are needed',
    message:
      input.gate === 'before_offer'
        ? `We have asked for ${rows.length || chosen.length} document${(rows.length || chosen.length) === 1 ? '' : 's'} so we can take your application forward. You can upload them from your portal.`
        : `We have asked for the documents we need before your first day. You can upload them from your portal as you get them.`,
    type: 'documents_requested',
    referenceId: checklist.id,
    referenceType: 'preboarding_checklist',
  })

  return checklist as PreboardingChecklist
}

// ── The candidate's own view ────────────────────────────────────────────────

export async function getMyChecklists(): Promise<PreboardingChecklist[]> {
  // Scoped by candidate_reads_own_checklist, so no filter is needed here —
  // and adding one would be a comfort rather than a control.
  const { data, error } = await supabase
    .from('preboarding_checklists')
    .select('*, items:preboarding_checklist_items(*)')
    .neq('status', 'draft')
    .order('gate')
  if (error) throw error
  return (data ?? []) as unknown as PreboardingChecklist[]
}

export async function uploadCandidateDocument(input: {
  item: PreboardingItem
  candidate_id: string
  file: File
}): Promise<void> {
  const safeName = input.file.name.replace(/[^\w.\-]+/g, '_')
  const path = `${input.candidate_id}/${input.item.id}_${safeName}`

  await uploadFile(CANDIDATE_BUCKET, path, input.file)

  const { error } = await supabase
    .from('preboarding_checklist_items')
    .update({
      status: 'uploaded',
      storage_bucket: CANDIDATE_BUCKET,
      storage_path: path,
      file_name: input.file.name,
      file_size: input.file.size,
      mime_type: input.file.type,
      uploaded_at: new Date().toISOString(),
      // Clearing the old reason matters: otherwise a re-upload still shows
      // why the previous attempt was turned down.
      rejection_reason: null,
    })
    .eq('id', input.item.id)
  if (error) throw error

  // Somebody has to look at it. Told after the row is saved, so a failure
  // here cannot lose the upload.
  await notifyRoles(HR_AND_ADMIN, {
    title: 'A candidate sent a document',
    message: `${input.item.label} has been uploaded and is waiting to be checked.`,
    type: 'document_uploaded',
    referenceId: input.item.checklist_id,
    referenceType: 'preboarding_checklist',
  })
}

export async function getDocumentLink(item: PreboardingItem): Promise<string | null> {
  if (!item.storage_path) return null
  return getSignedUrl(item.storage_bucket ?? CANDIDATE_BUCKET, item.storage_path)
}

// ── HR checking it ──────────────────────────────────────────────────────────

export async function reviewDocument(input: {
  item_id: string
  status: 'verified' | 'rejected'
  rejection_reason?: string | null
  reviewer_profile_id: string
}) {
  const { error } = await supabase
    .from('preboarding_checklist_items')
    .update({
      status: input.status,
      rejection_reason: input.status === 'rejected' ? input.rejection_reason ?? null : null,
      reviewed_by: input.reviewer_profile_id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', input.item_id)
  if (error) throw error
}

export async function approveChecklist(checklistId: string, reviewerProfileId: string) {
  const { error } = await supabase
    .from('preboarding_checklists')
    .update({
      status: 'approved',
      reviewed_by: reviewerProfileId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', checklistId)
  if (error) throw error
}

// ── Joining day: it becomes part of their employee record ───────────────────

/**
 * Copy what a candidate uploaded onto their employee record.
 *
 * Without this the joining pack gets collected twice — once from the
 * candidate and again from the new joiner — which is the complaint people
 * actually have about starting a job.
 *
 * Returns how many files moved across. Deliberately forgiving: a document
 * that cannot be copied must not stop somebody being hired, so it is counted
 * and reported rather than thrown.
 */
export async function carryDocumentsToEmployee(input: {
  organization_id: string
  candidate_id: string
  employee_id: string
}): Promise<{ moved: number; failed: number }> {
  const lists = await getChecklistsForCandidate(input.candidate_id)
  const items = lists
    .flatMap((l) => l.items ?? [])
    .filter((i) => i.storage_path && (i.status === 'verified' || i.status === 'uploaded'))

  let moved = 0
  let failed = 0

  for (const item of items) {
    try {
      const fileName = item.file_name ?? 'document'
      const safeName = fileName.replace(/[^\w.\-]+/g, '_')
      const target = `${input.employee_id}/preboarding/${item.id}_${safeName}`

      const copied = await copyBetweenBuckets(
        item.storage_bucket ?? CANDIDATE_BUCKET,
        item.storage_path!,
        EMPLOYEE_BUCKET,
        target
      )
      if (!copied) {
        failed += 1
        continue
      }

      const { error } = await supabase.from('employee_documents').insert({
        organization_id: input.organization_id,
        employee_id: input.employee_id,
        document_category: 'other',
        document_name: item.label,
        file_url: target,
        file_size: item.file_size,
        // Carried over, not re-checked. If HR verified it before joining it
        // stays verified; anything still unchecked stays that way.
        verification_status: item.status === 'verified' ? 'verified' : 'pending',
      })
      if (error) {
        failed += 1
        continue
      }
      moved += 1
    } catch {
      failed += 1
    }
  }

  return { moved, failed }
}

// ── Erasing what we no longer have a reason to hold ─────────────────────────

export interface PurgeCandidate {
  candidate_id: string
  candidate_name: string
  closed_on: string
  days_held: number
  document_count: number
  storage_paths: string[]
}

export async function getDocumentsDueForPurge(orgId: string): Promise<PurgeCandidate[]> {
  const { data, error } = await supabase.rpc('candidate_documents_due_for_purge', {
    p_org: orgId,
  })
  if (error) throw error
  return (data ?? []) as PurgeCandidate[]
}

/**
 * Erase one candidate's documents.
 *
 * Files first, then the row. That order matters: if the row were cleared
 * first and the file delete then failed, nothing would ever point at the file
 * again and it would sit in storage forever, unreachable and undeleted —
 * which is exactly the state the DPDP Act is about.
 *
 * The label of what was asked for is kept. Being able to show that a PAN card
 * was requested and provided is useful; holding the card is not.
 */
export async function purgeCandidateDocuments(input: {
  candidate_id: string
  storage_paths: string[]
}): Promise<{ filesRemoved: number; rowsCleared: number }> {
  let filesRemoved = 0

  if (input.storage_paths.length > 0) {
    const { data, error } = await supabase.storage
      .from(CANDIDATE_BUCKET)
      .remove(input.storage_paths)
    if (error) throw error
    filesRemoved = data?.length ?? 0
  }

  const { data: cleared, error: rpcErr } = await supabase.rpc('purge_candidate_documents', {
    p_candidate: input.candidate_id,
  })
  if (rpcErr) throw rpcErr

  return { filesRemoved, rowsCleared: (cleared as number) ?? 0 }
}

/**
 * Change how long candidate documents are kept.
 *
 * Returns the row, and complains if nothing came back. Only a super admin may
 * write to organizations, and row-level security does not refuse an update it
 * disallows — it narrows it to nothing and reports success. Without this
 * check, HR pressing Save would see "Saved" and the number would not have
 * moved, which is the worst of both: wrong, and reassuring.
 */
export async function setRetentionDays(orgId: string, days: number) {
  const { data, error } = await supabase
    .from('organizations')
    .update({ candidate_data_retention_days: days })
    .eq('id', orgId)
    .select('candidate_data_retention_days')

  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error(
      'That did not save. Changing the retention period is a super admin setting.'
    )
  }
}
