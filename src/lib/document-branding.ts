/**
 * One place for how every August document looks — letters, offer letters and payslips.
 *
 * Before this existed each generator drew its own "logo" out of plain circles and
 * carried its own copy of the company address, so the three documents slowly drifted
 * apart. Anything to do with the letterhead or the footer belongs here, not in a
 * generator.
 */
import type jsPDF from 'jspdf'
import { AUGUST_LOGO_PNG, AUGUST_LOGO_ASPECT } from './brand/august-logo'

type RGB = [number, number, number]

/** Taken from the August Design System artwork, not guessed. */
export const AUGUST_ROSE: RGB = [191, 32, 81]

export const DOC_COLORS = {
  rose: AUGUST_ROSE,
  ink: [30, 30, 30] as RGB,
  muted: [110, 110, 115] as RGB,
  border: [214, 214, 219] as RGB,
  panel: [246, 246, 248] as RGB,
  white: [255, 255, 255] as RGB,
}

export const PAGE_WIDTH = 210
export const PAGE_HEIGHT = 297
export const PAGE_MARGIN = 20

/**
 * Nothing in the body may run below this line, or it collides with the footer.
 * Generators check against it before adding a page.
 */
export const CONTENT_BOTTOM = 258

/** Used only when the organisation record has not been filled in yet. */
export const FALLBACK_COMPANY_NAME = 'Augustinnovate Pvt. Ltd.'
export const FALLBACK_COMPANY_ADDRESS =
  '4th Floor, #597, 15th Cross Road, Outer Ring Rd, MG Layout, JP Nagar Phase 6, ' +
  'J. P. Nagar, Bengaluru, Karnataka 560078'

/**
 * The line the business asked to appear on every document. Kept as one constant so
 * the wording is identical everywhere and can be changed in a single place.
 */
export const COMPUTER_GENERATED_NOTE =
  'This is a computer generated statement and does not require signature.'

/** The bits of the organisation record a document actually needs. */
export interface DocumentOrg {
  name?: string | null
  address?: Record<string, string> | null
  cin?: string | null
  website?: string | null
  phone?: string | null
  email?: string | null
}

export function companyName(org?: DocumentOrg | null): string {
  return org?.name?.trim() || FALLBACK_COMPANY_NAME
}

/**
 * Address comes from Company Settings so HR can correct it without a release.
 * The hard-coded address is only a safety net for a half-filled organisation record.
 */
export function companyAddress(org?: DocumentOrg | null): string {
  const a = org?.address
  if (a) {
    const parts = [a.line1, a.line2, a.city, a.state, a.pincode].filter(
      (p) => typeof p === 'string' && p.trim() !== ''
    )
    if (parts.length > 0) return parts.join(', ')
  }
  return FALLBACK_COMPANY_ADDRESS
}

export function companyCin(org?: DocumentOrg | null): string | null {
  const cin = org?.cin?.trim()
  return cin ? cin : null
}

/**
 * Draws the August logo at a given width. Height follows the artwork's own ratio so
 * the mark is never stretched.
 */
export function drawAugustLogo(doc: jsPDF, x: number, y: number, widthMm: number): number {
  const heightMm = widthMm / AUGUST_LOGO_ASPECT
  doc.addImage(AUGUST_LOGO_PNG, 'PNG', x, y, widthMm, heightMm)
  return heightMm
}

interface LetterheadOptions {
  /** Small label on the right, e.g. "Payslip" or "Offer Letter". */
  eyebrow?: string
  /** Logo width in mm. */
  logoWidth?: number
}

/**
 * Letterhead on a white page: logo on the left, registered details on the right,
 * a thin rose rule underneath. Returns the y the body can start at.
 */
export function drawLetterhead(
  doc: jsPDF,
  org: DocumentOrg | null | undefined,
  opts: LetterheadOptions = {}
): number {
  const { eyebrow, logoWidth = 40 } = opts
  const top = 16

  const logoHeight = drawAugustLogo(doc, PAGE_MARGIN, top, logoWidth)

  // Right-hand block: legal name, then registered address wrapped to the space left
  // over beside the logo.
  const rightEdge = PAGE_WIDTH - PAGE_MARGIN
  const blockWidth = rightEdge - (PAGE_MARGIN + logoWidth) - 8
  let ry = top + 2

  if (eyebrow) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...DOC_COLORS.rose)
    doc.text(eyebrow.toUpperCase(), rightEdge, ry, { align: 'right' })
    ry += 4
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...DOC_COLORS.ink)
  doc.text(companyName(org), rightEdge, ry, { align: 'right' })
  ry += 3.6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...DOC_COLORS.muted)
  for (const line of doc.splitTextToSize(companyAddress(org), blockWidth) as string[]) {
    doc.text(line, rightEdge, ry, { align: 'right' })
    ry += 2.9
  }
  if (org?.website) {
    doc.text(org.website, rightEdge, ry, { align: 'right' })
    ry += 2.9
  }

  const ruleY = Math.max(top + logoHeight, ry) + 4
  doc.setDrawColor(...DOC_COLORS.rose)
  doc.setLineWidth(0.6)
  doc.line(PAGE_MARGIN, ruleY, rightEdge, ruleY)

  return ruleY + 10
}

/**
 * Stamps the footer on every page, so it is still there when a letter runs long.
 * Call this once, after all the content has been written.
 *
 * Contents are fixed by the business: copyright with the company name and the
 * current year, the registered address, the CIN when we hold one, and the
 * computer-generated note.
 */
export function stampFooters(
  doc: jsPDF,
  org?: DocumentOrg | null,
  margin: number = PAGE_MARGIN
): void {
  const lines: string[] = [
    `© ${new Date().getFullYear()} ${companyName(org)}`,
    companyAddress(org),
  ]
  const cin = companyCin(org)
  if (cin) lines.push(`CIN: ${cin}`)

  const textWidth = PAGE_WIDTH - margin * 2
  // Wrap first, then lay the block out upwards from the bottom, so a long address
  // pushes the rule up instead of running off the page.
  const wrapped: string[] = []
  for (const line of lines) {
    wrapped.push(...(doc.splitTextToSize(line, textWidth) as string[]))
  }

  const lineHeight = 3.2
  const bottom = PAGE_HEIGHT - 12
  const noteY = bottom
  const firstLineY = noteY - 3.8 - (wrapped.length - 1) * lineHeight
  const ruleY = firstLineY - 4

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page)

    doc.setDrawColor(...DOC_COLORS.rose)
    doc.setLineWidth(0.4)
    doc.line(margin, ruleY, PAGE_WIDTH - margin, ruleY)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...DOC_COLORS.muted)
    wrapped.forEach((line, i) => {
      doc.text(line, PAGE_WIDTH / 2, firstLineY + i * lineHeight, { align: 'center' })
    })

    doc.setFont('helvetica', 'italic')
    doc.setFontSize(6.5)
    doc.text(COMPUTER_GENERATED_NOTE, PAGE_WIDTH / 2, noteY, { align: 'center' })

    if (pageCount > 1) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6)
      doc.text(`Page ${page} of ${pageCount}`, PAGE_WIDTH - margin, ruleY - 2.5, {
        align: 'right',
      })
    }
  }
}
