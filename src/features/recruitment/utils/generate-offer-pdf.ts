import jsPDF from 'jspdf'
import type { Organization } from '@/types/database.types'

/**
 * F13 — the offer as a document the candidate can actually be sent.
 *
 * Kept visually consistent with the payslip and letter PDFs: same August mark,
 * same muted palette, same footer.
 */

const COMPANY_ADDRESS =
  '4th Floor, #597, 15th Cross Road, Outer Ring Rd, MG Layout, JP Nagar Phase 6, J. P. Nagar, Bengaluru, Karnataka 560078'

const COLORS = {
  dark: [30, 30, 30] as [number, number, number],
  muted: [100, 100, 100] as [number, number, number],
  light: [245, 245, 247] as [number, number, number],
  border: [210, 210, 215] as [number, number, number],
  accent: [180, 40, 100] as [number, number, number],
}

function drawAugustLogo(doc: jsPDF, x: number, y: number, size: number) {
  const cx = x + size / 2
  const cy = y + size / 2
  const r = size / 2
  doc.setDrawColor(180, 40, 100)
  doc.setLineWidth(1.2)
  doc.setFillColor(255, 255, 255)
  doc.circle(cx, cy, r, 'FD')
  doc.setLineWidth(1.0)
  doc.circle(cx, cy, r * 0.65, 'D')
  doc.setFillColor(180, 40, 100)
  doc.circle(cx, cy, r * 0.3, 'F')
}

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
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 48
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // ── Header ────────────────────────────────────────────────
  drawAugustLogo(doc, margin, y, 28)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...COLORS.dark)
  doc.text(organization?.name ?? 'Augustinnovate Pvt. Ltd.', margin + 38, y + 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...COLORS.muted)
  const addressLines = doc.splitTextToSize(COMPANY_ADDRESS, contentWidth - 46)
  doc.text(addressLines, margin + 38, y + 23)

  y += 28 + addressLines.length * 9 + 12
  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.6)
  doc.line(margin, y, pageWidth - margin, y)
  y += 24

  // ── Title ─────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...COLORS.dark)
  doc.text('Letter of Offer', margin, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...COLORS.muted)
  doc.text(longDate(new Date().toISOString()), pageWidth - margin, y, { align: 'right' })
  if (data.version && data.version > 1) {
    doc.text(`Revision ${data.version}`, pageWidth - margin, y + 12, { align: 'right' })
  }
  y += 28

  // ── Addressee ─────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...COLORS.dark)
  doc.text(data.candidateName, margin, y)
  y += 13
  if (data.candidateEmail) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.muted)
    doc.text(data.candidateEmail, margin, y)
    y += 16
  } else {
    y += 4
  }

  // ── Body ──────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...COLORS.dark)

  const intro =
    `Dear ${data.candidateName.split(' ')[0]},\n\n` +
    `We are pleased to offer you the position of ${data.designation} at ` +
    `${organization?.name ?? 'our company'}. We were impressed by you through the hiring ` +
    `process and we believe you will make a strong addition to the team.\n\n` +
    `The main terms of this offer are set out below.`
  const introLines = doc.splitTextToSize(intro, contentWidth)
  doc.text(introLines, margin, y)
  y += introLines.length * 13 + 14

  // ── Terms box ─────────────────────────────────────────────
  const rows: Array<[string, string]> = [
    ['Position', data.designation],
    ['Annual cost to company', rupees(data.ctc)],
    ['Date of joining', longDate(data.joiningDate)],
  ]
  if (data.requisitionTitle) rows.push(['Role reference', data.requisitionTitle])
  if (data.validUntil) rows.push(['Offer valid until', longDate(data.validUntil)])

  const rowHeight = 22
  const boxHeight = rows.length * rowHeight + 10

  doc.setFillColor(...COLORS.light)
  doc.setDrawColor(...COLORS.border)
  doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, 'FD')

  let ry = y + 18
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.muted)
    doc.text(label, margin + 14, ry)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.dark)
    doc.text(value, pageWidth - margin - 14, ry, { align: 'right' })
    ry += rowHeight
  })
  y += boxHeight + 20

  // ── Notes ─────────────────────────────────────────────────
  if (data.offerNotes) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...COLORS.dark)
    const noteLines = doc.splitTextToSize(data.offerNotes, contentWidth)
    doc.text(noteLines, margin, y)
    y += noteLines.length * 13 + 14
  }

  // ── Closing ───────────────────────────────────────────────
  const closing =
    `This offer is subject to verification of the documents and references you have provided.\n\n` +
    `To accept, please sign below and return a copy` +
    `${data.validUntil ? ` on or before ${longDate(data.validUntil)}` : ''}. ` +
    `If anything here is unclear, do come back to us — we are happy to talk it through.\n\n` +
    `We look forward to working with you.`
  const closingLines = doc.splitTextToSize(closing, contentWidth)
  doc.text(closingLines, margin, y)
  y += closingLines.length * 13 + 30

  // ── Signatures ────────────────────────────────────────────
  const colWidth = (contentWidth - 30) / 2
  doc.setDrawColor(...COLORS.border)
  doc.line(margin, y, margin + colWidth, y)
  doc.line(margin + colWidth + 30, y, pageWidth - margin, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...COLORS.muted)
  doc.text('For ' + (organization?.name ?? 'the company'), margin, y + 13)
  doc.text('Accepted by ' + data.candidateName, margin + colWidth + 30, y + 13)
  doc.text('Authorised signatory', margin, y + 24)
  doc.text('Date', margin + colWidth + 30, y + 24)

  // ── Footer ────────────────────────────────────────────────
  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.6)
  doc.line(margin, pageHeight - 46, pageWidth - margin, pageHeight - 46)
  doc.setFontSize(7.5)
  doc.setTextColor(...COLORS.muted)
  doc.text(
    `© ${new Date().getFullYear()} Augustinnovate Pvt. Ltd.`,
    margin,
    pageHeight - 32
  )
  doc.text('This is a computer-generated offer letter.', pageWidth - margin, pageHeight - 32, {
    align: 'right',
  })

  const safeName = data.candidateName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  doc.save(`offer-${safeName}.pdf`)
}
