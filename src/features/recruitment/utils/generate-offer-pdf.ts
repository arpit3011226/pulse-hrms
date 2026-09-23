import jsPDF from 'jspdf'
import type { Organization } from '@/types/database.types'
import {
  CONTENT_BOTTOM,
  DOC_COLORS,
  PAGE_MARGIN,
  PAGE_WIDTH,
  companyName,
  drawLetterhead,
  stampFooters,
} from '@/lib/document-branding'

/**
 * F13 — the offer as a document the candidate can actually be sent.
 *
 * Shares the letterhead and footer with the payslip and letter PDFs. Measurements
 * are in millimetres, like the other two, so the shared helpers line up.
 */

function longDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function rupees(amount: number): string {
  return `INR ${amount.toLocaleString('en-IN')}`
}

export interface OfferPdfData {
  candidateName: string
  candidateEmail?: string | null
  designation: string
  ctc: number
  joiningDate: string
  validUntil?: string | null
  requisitionTitle?: string | null
  version?: number | null
  offerNotes?: string | null
}

export function generateOfferPdf(data: OfferPdfData, organization: Organization): void {
  const doc = new jsPDF('p', 'mm', 'a4')
  const contentWidth = PAGE_WIDTH - PAGE_MARGIN * 2
  const rightEdge = PAGE_WIDTH - PAGE_MARGIN
  const lineHeight = 4.6

  /** Start a new page when the next block would run into the footer. */
  function ensureSpace(needed: number) {
    if (y + needed > CONTENT_BOTTOM) {
      doc.addPage()
      y = PAGE_MARGIN
    }
  }

  let y = drawLetterhead(doc, organization, { eyebrow: 'Offer Letter' })

  // ── Title ─────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...DOC_COLORS.ink)
  doc.text('Letter of Offer', PAGE_MARGIN, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...DOC_COLORS.muted)
  doc.text(longDate(new Date().toISOString()), rightEdge, y, { align: 'right' })
  if (data.version && data.version > 1) {
    doc.text(`Revision ${data.version}`, rightEdge, y + 4.2, { align: 'right' })
  }
  y += 10

  // ── Addressee ─────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...DOC_COLORS.ink)
  doc.text(data.candidateName, PAGE_MARGIN, y)
  y += 4.6
  if (data.candidateEmail) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...DOC_COLORS.muted)
    doc.text(data.candidateEmail, PAGE_MARGIN, y)
    y += 5.6
  } else {
    y += 1.4
  }

  // ── Body ──────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...DOC_COLORS.ink)

  // "Augustinnovate Pvt. Ltd." already ends in a full stop, so do not add a second one.
  const name = companyName(organization)
  const nameStop = name.endsWith('.') ? '' : '.'
  const intro =
    `Dear ${data.candidateName.split(' ')[0]},\n\n` +
    `We are pleased to offer you the position of ${data.designation} at ` +
    `${name}${nameStop} We were impressed by you through the hiring ` +
    `process and we believe you will make a strong addition to the team.\n\n` +
    `The main terms of this offer are set out below.`
  const introLines = doc.splitTextToSize(intro, contentWidth) as string[]
  ensureSpace(introLines.length * lineHeight)
  doc.text(introLines, PAGE_MARGIN, y)
  y += introLines.length * lineHeight + 5

  // ── Terms box ─────────────────────────────────────────────
  const rows: Array<[string, string]> = [
    ['Position', data.designation],
    ['Annual cost to company', rupees(data.ctc)],
    ['Date of joining', longDate(data.joiningDate)],
  ]
  if (data.requisitionTitle) rows.push(['Role reference', data.requisitionTitle])
  if (data.validUntil) rows.push(['Offer valid until', longDate(data.validUntil)])

  const rowHeight = 7.8
  const boxHeight = rows.length * rowHeight + 3.5

  ensureSpace(boxHeight)
  doc.setFillColor(...DOC_COLORS.panel)
  doc.setDrawColor(...DOC_COLORS.border)
  doc.setLineWidth(0.3)
  doc.roundedRect(PAGE_MARGIN, y, contentWidth, boxHeight, 1.5, 1.5, 'FD')

  let ry = y + 6.4
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...DOC_COLORS.muted)
    doc.text(label, PAGE_MARGIN + 5, ry)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DOC_COLORS.ink)
    doc.text(value, rightEdge - 5, ry, { align: 'right' })
    ry += rowHeight
  })
  y += boxHeight + 7

  // ── Notes ─────────────────────────────────────────────────
  if (data.offerNotes) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...DOC_COLORS.ink)
    const noteLines = doc.splitTextToSize(data.offerNotes, contentWidth) as string[]
    ensureSpace(noteLines.length * lineHeight)
    doc.text(noteLines, PAGE_MARGIN, y)
    y += noteLines.length * lineHeight + 5
  }

  // ── Closing ───────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...DOC_COLORS.ink)
  const closing =
    `This offer is subject to verification of the documents and references you have provided.\n\n` +
    `To accept, please sign below and return a copy` +
    `${data.validUntil ? ` on or before ${longDate(data.validUntil)}` : ''}. ` +
    `If anything here is unclear, do come back to us — we are happy to talk it through.\n\n` +
    `We look forward to working with you.`
  const closingLines = doc.splitTextToSize(closing, contentWidth) as string[]
  ensureSpace(closingLines.length * lineHeight)
  doc.text(closingLines, PAGE_MARGIN, y)
  y += closingLines.length * lineHeight + 11

  // ── Signatures ────────────────────────────────────────────
  // Never split the signature block across pages.
  ensureSpace(12)
  const colWidth = (contentWidth - 10) / 2
  doc.setDrawColor(...DOC_COLORS.border)
  doc.setLineWidth(0.3)
  doc.line(PAGE_MARGIN, y, PAGE_MARGIN + colWidth, y)
  doc.line(PAGE_MARGIN + colWidth + 10, y, rightEdge, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...DOC_COLORS.muted)
  doc.text(`For ${companyName(organization)}`, PAGE_MARGIN, y + 4.6)
  doc.text(`Accepted by ${data.candidateName}`, PAGE_MARGIN + colWidth + 10, y + 4.6)
  doc.text('Authorised signatory', PAGE_MARGIN, y + 8.6)
  doc.text('Date', PAGE_MARGIN + colWidth + 10, y + 8.6)

  stampFooters(doc, organization)

  const safeName = data.candidateName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  doc.save(`offer-${safeName}.pdf`)
}
