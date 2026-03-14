import jsPDF from 'jspdf'
import type { Organization } from '@/types/database.types'

const COMPANY_ADDRESS = '4th Floor, #597, 15th Cross Road, Outer Ring Rd, MG Layout, JP Nagar Phase 6, J. P. Nagar, Bengaluru, Karnataka 560078'

const COLORS = {
  primary: [50, 50, 55] as [number, number, number],
  dark: [30, 30, 30] as [number, number, number],
  muted: [100, 100, 100] as [number, number, number],
  light: [245, 245, 247] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
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

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

/** Strip HTML tags and convert to plain text lines */
function htmlToLines(html: string): string[] {
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
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
  const pageWidth = 210
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // ── Header bar ──
  doc.setFillColor(...COLORS.primary)
  doc.rect(0, 0, pageWidth, 32, 'F')

  drawAugustLogo(doc, margin, 5, 10)

  doc.setTextColor(...COLORS.white)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(organization.name || 'Augustinnovate Pvt. Ltd.', margin + 14, 13)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(COMPANY_ADDRESS, margin + 14, 19)
  if (organization.website) {
    doc.text(organization.website, margin + 14, 24)
  }

  y = 42

  // ── Date (right-aligned) ──
  doc.setTextColor(...COLORS.muted)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date: ${formatDateShort(date)}`, pageWidth - margin, y, { align: 'right' })
  y += 10

  // ── Letter Title ──
  doc.setTextColor(...COLORS.dark)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(letterTitle, pageWidth / 2, y, { align: 'center' })
  y += 12

  // ── Body content ──
  doc.setTextColor(...COLORS.dark)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  const lines = htmlToLines(resolvedHtml)
  const lineHeight = 5

  for (const line of lines) {
    if (line.trim() === '') {
      y += 4
      continue
    }

    const wrappedLines = doc.splitTextToSize(line, contentWidth)
    for (const wl of wrappedLines) {
      if (y > 260) {
        doc.addPage()
        y = margin
      }
      doc.text(wl, margin, y)
      y += lineHeight
    }
  }

  // ── Signature block ──
  y = Math.max(y + 20, 210)
  if (y > 240) {
    doc.addPage()
    y = margin + 20
  }

  doc.setTextColor(...COLORS.dark)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('For ' + (organization.name || 'Augustinnovate Pvt. Ltd.'), margin, y)
  y += 18

  doc.setLineWidth(0.3)
  doc.setDrawColor(...COLORS.border)
  doc.line(margin, y, margin + 50, y)
  y += 5

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Authorized Signatory', margin, y)

  // ── Footer ──
  const footerY = 280
  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.3)
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)

  doc.setTextColor(...COLORS.muted)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'italic')
  doc.text(
    'This is a computer-generated document and does not require a physical signature.',
    pageWidth / 2, footerY, { align: 'center' }
  )

  // Download
  const safeName = letterTitle.replace(/\s+/g, '_')
  const safeEmployee = employeeName.replace(/\s+/g, '_')
  doc.save(`${safeName}_${safeEmployee}.pdf`)
}
