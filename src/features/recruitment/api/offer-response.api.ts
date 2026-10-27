import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { notifyRoles, HR_AND_ADMIN } from '@/lib/notify'
import { uploadFile, getSignedUrl } from '@/lib/storage'
import { buildSignedAgreementPdf } from '@/features/onboarding/utils/generate-agreement-pdf'
import type { DocumentOrg } from '@/lib/document-branding'

/**
 * A candidate answering their own offer.
 *
 * Before this the portal said "get back to your recruiter" and HR typed in
 * what they heard — so the record of the most important agreement in the
 * whole hiring process was somebody else's note that a phone call happened.
 *
 * Same shape as the onboarding agreements: freeze the terms that were
 * accepted, hash them, record who typed what and when. A revised offer
 * changes offered_ctc, and without the frozen copy there would be nothing
 * showing which figure was agreed to.
 */

export interface OfferTerms {
  offered_designation: string | null
  offered_ctc: number | null
  joining_date: string | null
  valid_until: string | null
  company_name: string
}

/** The terms as shown on screen, in the words the candidate actually read. */
export function renderOfferTerms(terms: OfferTerms): string {
  const rows = [
    ['Position', terms.offered_designation ?? '—'],
    ['Annual CTC', terms.offered_ctc != null ? formatCurrency(terms.offered_ctc) : '—'],
    ['Joining date', terms.joining_date ? formatDate(terms.joining_date) : '—'],
    ['Offer valid until', terms.valid_until ? formatDate(terms.valid_until) : '—'],
  ]
  return (
    `<h2>Offer from ${terms.company_name}</h2>` +
    '<ul>' +
    rows.map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`).join('') +
    '</ul>'
  )
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const OFFER_BUCKET = 'candidate-documents'

export async function respondToOffer(input: {
  offer_id: string
  response: 'accepted' | 'rejected'
  typed_name: string
  terms: OfferTerms
  candidate_id?: string | null
  organization?: DocumentOrg | null
  decline_reason?: string | null
}): Promise<void> {
  const html = renderOfferTerms(input.terms)
  const answeredAt = new Date().toISOString()

  /**
   * A copy they keep.
   *
   * Agreements already work this way and an accepted offer is the bigger
   * commitment of the two, so it was odd that one produced a document and
   * the other produced a database row. Built from the same frozen text that
   * is hashed below, not re-rendered later from whatever the code does then.
   *
   * Only on acceptance: nobody wants a keepsake of a job they turned down.
   * And deliberately forgiving — if the PDF cannot be made or stored, the
   * answer still goes through. Losing somebody's acceptance because a file
   * would not write is far worse than them having to ask HR for a copy.
   */
  let pdfPath: string | null = null
  if (input.response === 'accepted' && input.candidate_id && input.organization) {
    try {
      const pdf = buildSignedAgreementPdf({
        title: 'Offer of Employment',
        renderedHtml: html,
        organization: input.organization,
        signerName: input.typed_name,
        signedName: input.typed_name,
        signedAt: answeredAt,
        consentStatement:
          'I have read the terms above and I accept this offer of employment.',
        contentHash: await sha256(html),
      })
      const path = `${input.candidate_id}/offer/${input.offer_id}.pdf`
      await uploadFile(OFFER_BUCKET, path, new File([pdf], `${input.offer_id}.pdf`, {
        type: 'application/pdf',
      }))
      pdfPath = path
    } catch (err) {
      console.warn('Could not store the signed offer PDF:', err)
    }
  }

  const { error } = await supabase
    .from('offer_letters')
    .update({
      offer_status: input.response,
      responded_at: answeredAt,
      accepted_name: input.typed_name,
      accepted_at: answeredAt,
      accepted_pdf_path: pdfPath,
      accepted_user_agent: navigator.userAgent,
      // Frozen whichever way they answered. Knowing what somebody turned
      // down matters as much as knowing what they took.
      accepted_terms_html: html,
      accepted_sha256: await sha256(html),
      decline_reason: input.response === 'rejected' ? input.decline_reason ?? null : null,
    })
    .eq('id', input.offer_id)

  if (error) throw error

  // This is the answer the hiring team has been waiting for. Leaving them to
  // notice it on a list is how a start date slips.
  await notifyRoles([...HR_AND_ADMIN, 'manager'], {
    title: input.response === 'accepted' ? 'An offer was accepted' : 'An offer was declined',
    message:
      input.response === 'accepted'
        ? `${input.typed_name} accepted the offer for ${input.terms.offered_designation ?? 'the role'}.`
        : `${input.typed_name} declined the offer for ${input.terms.offered_designation ?? 'the role'}.` +
          (input.decline_reason ? ` They said: ${input.decline_reason}` : ''),
    type: input.response === 'accepted' ? 'offer_accepted' : 'offer_declined',
    referenceId: input.offer_id,
    referenceType: 'offer_letter',
  })
}

/** The signed copy of an accepted offer, if one was stored. */
export async function getOfferPdfUrl(pdfPath: string | null): Promise<string | null> {
  if (!pdfPath) return null
  return getSignedUrl(OFFER_BUCKET, pdfPath)
}
