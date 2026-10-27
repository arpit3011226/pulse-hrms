import { supabase } from '@/lib/supabase'
import { uploadFile, getSignedUrl } from '@/lib/storage'
import { buildSignedAgreementPdf } from '../utils/generate-agreement-pdf'
import type { DocumentOrg } from '@/lib/document-branding'

/**
 * Digital onboarding — the legal documents a joiner reads and signs.
 *
 * The thing that makes this more than a tick box: when an agreement is
 * issued, the placeholders are filled in and the resulting text is frozen on
 * the row along with a SHA-256 of it. Editing a template afterwards creates a
 * new version and leaves every signature already given pointing at the words
 * that were actually on the screen.
 */

const AGREEMENT_BUCKET = 'employee-documents'

export interface AgreementTemplate {
  id: string
  organization_id: string
  code: string
  title: string
  category: string
  description: string | null
  body_html: string
  version: number
  consent_statement: string
  is_active: boolean
  needs_legal_review: boolean
  sort_order: number
}

export interface EmployeeAgreement {
  id: string
  organization_id: string
  employee_id: string
  template_id: string | null
  template_version: number
  title: string
  rendered_html: string
  rendered_sha256: string | null
  status: 'pending' | 'viewed' | 'signed' | 'declined' | 'superseded'
  is_mandatory: boolean
  issued_at: string | null
  viewed_at: string | null
  signed_at: string | null
  signed_name: string | null
  consent_statement: string | null
  pdf_path: string | null
  declined_reason: string | null
}

/** Fill in the placeholders a joining document actually needs. */
export interface AgreementContext {
  employee_name: string
  employee_code: string | null
  designation: string | null
  department: string | null
  date_of_joining: string | null
  company_name: string
  company_address: string
}

function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export interface ResolvedAgreement {
  html: string
  /** Placeholders the template used that we have no value for. */
  unresolved: string[]
}

/**
 * Fill in the placeholders, and never leave template syntax behind.
 *
 * A template can only use the tokens below. If somebody writes
 * {{manager_name}} into an NDA, there is no value for it — and a signed legal
 * document that reads "your manager is {{manager_name}}" is worse than one
 * that simply does not mention a manager. So anything left over is removed
 * and reported, rather than printed.
 *
 * Tidying the spacing afterwards matters for the same reason. Dropping a
 * token mid-sentence leaves a double space and a stranded comma, which looks
 * like a mistake even when the wording is right.
 */
export function resolveAgreementPlaceholders(
  html: string,
  ctx: AgreementContext
): ResolvedAgreement {
  const map: Record<string, string> = {
    '{{employee_name}}': ctx.employee_name,
    '{{employee_code}}': ctx.employee_code ?? '',
    '{{designation}}': ctx.designation ?? '',
    '{{department}}': ctx.department ?? '',
    '{{date_of_joining}}': formatDate(ctx.date_of_joining),
    '{{company_name}}': ctx.company_name,
    '{{company_address}}': ctx.company_address,
    '{{current_date}}': formatDate(new Date().toISOString()),
  }

  let out = html
  for (const [token, value] of Object.entries(map)) {
    out = out.replaceAll(token, value)
  }

  const unresolved = [...new Set(out.match(/\{\{[a-z0-9_]+\}\}/gi) ?? [])]
  for (const token of unresolved) {
    out = out.replaceAll(token, '')
  }

  out = out
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ ([,.;:])/g, '$1')
    .replace(/\(\s*\)/g, '')

  return { html: out, unresolved }
}

/**
 * A fingerprint of exactly what was agreed.
 *
 * Without this, "here is the text we say you signed" is an assertion. With
 * it, the text either hashes to the recorded value or it has been changed.
 */
export async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── Templates ───────────────────────────────────────────────────────────────

export async function getAgreementTemplates(orgId: string): Promise<AgreementTemplate[]> {
  const { data, error } = await supabase
    .from('agreement_templates')
    .select('*')
    .eq('organization_id', orgId)
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as AgreementTemplate[]
}

export async function saveAgreementTemplate(
  input: Partial<AgreementTemplate> & { id?: string; organization_id: string }
) {
  // A change of wording is a new version, never a silent overwrite of what
  // people have already signed. The signatures themselves keep their own
  // frozen copy, so bumping this only affects what is issued next.
  const payload = input.id
    ? { ...input, version: (input.version ?? 1) + 1 }
    : input
  const { data, error } = await supabase
    .from('agreement_templates')
    .upsert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Issuing ─────────────────────────────────────────────────────────────────

/**
 * Give one person everything the rules say applies to them.
 *
 * Skips anything they already hold at the same version, so running it twice
 * is harmless — which matters, because onboarding gets re-run.
 */
export async function issueAgreementsToEmployee(input: {
  organization_id: string
  employee_id: string
  context: AgreementContext
  template_ids?: string[]
}): Promise<{ issued: number; unresolved: string[] }> {
  /**
   * Which documents apply to THIS person, from the assignment rules.
   *
   * Asked of the database rather than worked out here, because the same
   * question is asked by the signing screen, by HR's view and by any report,
   * and they must not be able to disagree. It is also plain Postgres, so it
   * survives the move to Azure.
   */
  const { data: applicable, error: ruleErr } = await supabase.rpc('agreements_for_employee', {
    p_employee: input.employee_id,
  })
  if (ruleErr) throw ruleErr

  const mandatoryById = new Map(
    ((applicable ?? []) as { template_id: string; is_mandatory: boolean }[]).map((r) => [
      r.template_id,
      r.is_mandatory,
    ])
  )

  const templates = (await getAgreementTemplates(input.organization_id)).filter(
    (t) =>
      t.is_active &&
      mandatoryById.has(t.id) &&
      (!input.template_ids?.length || input.template_ids.includes(t.id))
  )
  if (templates.length === 0) return { issued: 0, unresolved: [] }

  const { data: existing } = await supabase
    .from('employee_agreements')
    .select('template_id, template_version')
    .eq('employee_id', input.employee_id)

  const held = new Set(
    (existing ?? []).map((e) => `${e.template_id}:${e.template_version}`)
  )

  const rows = []
  const unresolved = new Set<string>()
  for (const t of templates) {
    if (held.has(`${t.id}:${t.version}`)) continue
    const rendered = resolveAgreementPlaceholders(t.body_html, input.context)
    rendered.unresolved.forEach((u) => unresolved.add(u))
    rows.push({
      organization_id: input.organization_id,
      employee_id: input.employee_id,
      template_id: t.id,
      template_version: t.version,
      title: t.title,
      rendered_html: rendered.html,
      rendered_sha256: await sha256(rendered.html),
      consent_statement: t.consent_statement,
      status: 'pending',
      is_mandatory: mandatoryById.get(t.id) ?? true,
    })
  }

  if (rows.length === 0) return { issued: 0, unresolved: [] }

  const { error } = await supabase.from('employee_agreements').insert(rows)
  if (error) throw error
  return { issued: rows.length, unresolved: [...unresolved] }
}

// ── The person's own view ───────────────────────────────────────────────────

export async function getMyAgreements(employeeId: string): Promise<EmployeeAgreement[]> {
  const { data, error } = await supabase
    .from('employee_agreements')
    .select('*')
    .eq('employee_id', employeeId)
    .neq('status', 'superseded')
    .order('issued_at')
  if (error) throw error
  return (data ?? []) as EmployeeAgreement[]
}

export async function markAgreementViewed(id: string) {
  const { error } = await supabase
    .from('employee_agreements')
    .update({ status: 'viewed', viewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
  if (error) throw error
}

/**
 * Sign it, and build the copy they keep.
 *
 * The PDF is made from the frozen text and stored, then the same file is
 * what they download. Storing it matters: a PDF regenerated years later from
 * whatever the code does then is not evidence of anything.
 */
export async function signAgreement(input: {
  agreement: EmployeeAgreement
  typed_name: string
  organization: DocumentOrg
  employee_code?: string | null
}): Promise<void> {
  const signedAt = new Date().toISOString()

  const pdf = buildSignedAgreementPdf({
    title: input.agreement.title,
    renderedHtml: input.agreement.rendered_html,
    organization: input.organization,
    signerName: input.typed_name,
    signedName: input.typed_name,
    signedAt,
    consentStatement: input.agreement.consent_statement,
    contentHash: input.agreement.rendered_sha256,
    employeeCode: input.employee_code,
  })

  const path = `${input.agreement.employee_id}/agreements/${input.agreement.id}.pdf`

  // Stored first. If this fails the signature is not recorded, which is the
  // right way round — a signature with no retrievable copy is worse than
  // asking somebody to press the button again.
  await uploadFile(AGREEMENT_BUCKET, path, new File([pdf], `${input.agreement.id}.pdf`, {
    type: 'application/pdf',
  }))

  const { error } = await supabase
    .from('employee_agreements')
    .update({
      status: 'signed',
      signed_at: signedAt,
      signed_name: input.typed_name,
      signer_user_agent: navigator.userAgent,
      pdf_path: path,
    })
    .eq('id', input.agreement.id)
  if (error) throw error
}

export async function getAgreementPdfUrl(agreement: EmployeeAgreement): Promise<string | null> {
  if (!agreement.pdf_path) return null
  return getSignedUrl(AGREEMENT_BUCKET, agreement.pdf_path)
}

// ── HR's view ───────────────────────────────────────────────────────────────

export async function getAgreementsForEmployee(employeeId: string): Promise<EmployeeAgreement[]> {
  return getMyAgreements(employeeId)
}

export async function getOutstandingAgreements(orgId: string) {
  const { data, error } = await supabase
    .from('employee_agreements')
    .select(
      '*, employee:employees!employee_agreements_employee_id_fkey(id, first_name, last_name, employee_code)'
    )
    .eq('organization_id', orgId)
    .in('status', ['pending', 'viewed'])
    .order('issued_at')
  if (error) throw error
  return (data ?? []) as unknown as (EmployeeAgreement & {
    employee: { id: string; first_name: string; last_name: string; employee_code: string } | null
  })[]
}

// ── Who has to sign what ────────────────────────────────────────────────────

export interface AssignmentRule {
  id: string
  organization_id: string
  template_id: string
  department_id: string | null
  designation_id: string | null
  employment_type: string | null
  is_mandatory: boolean
}

export async function getAssignmentRules(templateId: string): Promise<AssignmentRule[]> {
  const { data, error } = await supabase
    .from('agreement_assignment_rules')
    .select('*')
    .eq('template_id', templateId)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as AssignmentRule[]
}

export async function addAssignmentRule(input: Omit<AssignmentRule, 'id'>) {
  const { error } = await supabase.from('agreement_assignment_rules').insert(input)
  if (error) throw error
}

export async function deleteAssignmentRule(id: string) {
  const { error } = await supabase.from('agreement_assignment_rules').delete().eq('id', id)
  if (error) throw error
}
