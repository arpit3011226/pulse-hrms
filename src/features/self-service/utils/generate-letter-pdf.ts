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

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

/** Strip HTML tags and convert to plain text lines */
function htmlToLines(html: string): string[] {
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/(ul|ol)>/gi, '\n\n')
    .replace(/<li>/gi, '  • ')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return text.split('\n')
}

export function generateLetterPdf(
  resolvedHtml: string,
  letterTitle: string,
  organization: Organization,
  employeeName: string,
  date: string
): void {
  const doc = new jsPDF('p', 'mm', 'a4')
  const contentWidth = PAGE_WIDTH - PAGE_MARGIN * 2

  let y = drawLetterhead(doc, organization)

  // ── Date (right-aligned) ──
  doc.setTextColor(...DOC_COLORS.muted)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date: ${formatDateShort(date)}`, PAGE_WIDTH - PAGE_MARGIN, y, { align: 'right' })
  y += 10

  // ── Letter Title ──
  doc.setTextColor(...DOC_COLORS.ink)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(letterTitle, PAGE_WIDTH / 2, y, { align: 'center' })
  y += 12

  // ── Body content ──
  doc.setTextColor(...DOC_COLORS.ink)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  const lines = htmlToLines(resolvedHtml)
  const lineHeight = 5

  for (const line of lines) {
    if (line.trim() === '') {
      y += 4
      continue
    }

    const wrappedLines = doc.splitTextToSize(line, contentWidth) as string[]
    for (const wl of wrappedLines) {
      if (y > CONTENT_BOTTOM) {
        doc.addPage()
        y = PAGE_MARGIN
      }
      doc.text(wl, PAGE_MARGIN, y)
      y += lineHeight
    }
  }

  // ── Signature block ──
  // Keep it together: if it will not fit above the footer, start a fresh page.
  const signatureHeight = 30
  y = Math.max(y + 20, 200)
  if (y + signatureHeight > CONTENT_BOTTOM) {
    doc.addPage()
    y = PAGE_MARGIN + 20
  }

  doc.setTextColor(...DOC_COLORS.ink)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`For ${companyName(organization)}`, PAGE_MARGIN, y)
  y += 18

  doc.setLineWidth(0.3)
  doc.setDrawColor(...DOC_COLORS.border)
  doc.line(PAGE_MARGIN, y, PAGE_MARGIN + 50, y)
  y += 5

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Authorised Signatory', PAGE_MARGIN, y)

  stampFooters(doc, organization)

  // Download
  const safeName = letterTitle.replace(/\s+/g, '_')
  const safeEmployee = employeeName.replace(/\s+/g, '_')
  doc.save(`${safeName}_${safeEmployee}.pdf`)
}
