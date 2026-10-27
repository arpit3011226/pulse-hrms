import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { notifyRoles, HR_AND_ADMIN } from '@/lib/notify'

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

export async function respondToOffer(input: {
  offer_id: string
  response: 'accepted' | 'rejected'
  typed_name: string
  terms: OfferTerms
  decline_reason?: string | null
}): Promise<void> {
  const html = renderOfferTerms(input.terms)

  const { error } = await supabase
    .from('offer_letters')
    .update({
      offer_status: input.response,
      responded_at: new Date().toISOString(),
      accepted_name: input.typed_name,
      accepted_at: new Date().toISOString(),
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
    type: input.response === 'accepted' ? 'success' : 'info',
    referenceId: input.offer_id,
    referenceType: 'offer_letter',
  })
}
