import { supabase } from '@/lib/supabase'
import { uploadFile, getSignedUrl, copyBetweenBuckets } from '@/lib/storage'

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
