import jsPDF from 'jspdf'
import {
  CONTENT_BOTTOM,
  DOC_COLORS,
  PAGE_MARGIN,
  PAGE_WIDTH,
  drawLetterhead,
  stampFooters,
  type DocumentOrg,
} from '@/lib/document-branding'

/**
 * The copy somebody keeps of an agreement they have signed.
 *
 * Built from the text frozen when the agreement was issued, not from the
 * current template. If HR rewrites the NDA next year, the PDF downloaded by
 * somebody who signed last year still shows the words they actually agreed
 * to. That is the whole point of keeping rendered_html.
 *
 * Returns a Blob rather than saving it, because the same file is both stored
 * and handed to the person — it must be the identical bytes, not two
 * renderings that happen to look alike.
 */

function htmlToLines(html: string): { text: string; heading: boolean }[] {
  const out: { text: string; heading: boolean }[] = []

  // Headings are kept apart so the PDF does not read as one undifferentiated
  // wall of text — these documents are long enough already.
  const chunks = html.split(/(<h[1-6][^>]*>.*?<\/h[1-6]>)/gis)

  for (const chunk of chunks) {
    if (!chunk.trim()) continue
    const isHeading = /^<h[1-6]/i.test(chunk.trim())
    const text = chunk
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/(ul|ol)>/gi, '\n\n')
      .replace(/<li>/gi, '  • ')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (!text) continue
    for (const line of text.split('\n')) out.push({ text: line, heading: isHeading })
  }
  return out
}

export interface SignedAgreementPdfInput {
  title: string
  renderedHtml: string
  organization: DocumentOrg
  signerName: string
  signedName: string | null
  signedAt: string | null
  consentStatement: string | null
  contentHash: string | null
  employeeCode?: string | null
}

export function buildSignedAgreementPdf(input: SignedAgreementPdfInput): Blob {
  const doc = new jsPDF('p', 'mm', 'a4')
  const contentWidth = PAGE_WIDTH - PAGE_MARGIN * 2

  let y = drawLetterhead(doc, input.organization)

  doc.setTextColor(...DOC_COLORS.ink)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(input.title, PAGE_WIDTH / 2, y, { align: 'center' })
  y += 10

  const nextPage = () => {
    doc.addPage()
    y = PAGE_MARGIN
  }

  for (const line of htmlToLines(input.renderedHtml)) {
    doc.setFontSize(line.heading ? 11 : 9.5)
    doc.setFont('helvetica', line.heading ? 'bold' : 'normal')
    doc.setTextColor(...(line.heading ? DOC_COLORS.ink : DOC_COLORS.ink))

    if (line.heading) y += 3

    for (const wrapped of doc.splitTextToSize(line.text, contentWidth) as string[]) {
      if (y > CONTENT_BOTTOM) nextPage()
      doc.text(wrapped, PAGE_MARGIN, y)
      y += line.heading ? 6 : 5
    }
    if (!line.heading) y += 1.5
  }

  // ── The signature ──
  //
  // Everything that makes this evidence rather than a printout: who typed
  // what, when, the sentence they agreed to, and a fingerprint of the text
  // above. Section 63 of the Bharatiya Sakshya Adhiniyam 2023 is what this
  // is for.
  y += 8
  if (y + 52 > CONTENT_BOTTOM) nextPage()

  doc.setDrawColor(...DOC_COLORS.border)
  doc.line(PAGE_MARGIN, y, PAGE_WIDTH - PAGE_MARGIN, y)
  y += 7

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DOC_COLORS.ink)
  doc.text('Signed electronically', PAGE_MARGIN, y)
  y += 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DOC_COLORS.ink)

  const rows: [string, string][] = [
    ['Signed by', input.signedName || input.signerName],
    ['Employee number', input.employeeCode || '—'],
    [
      'Date and time',
      input.signedAt
        ? new Date(input.signedAt).toLocaleString('en-IN', {
            dateStyle: 'long',
            timeStyle: 'short',
          })
        : '—',
    ],
  ]
  for (const [label, value] of rows) {
    doc.setTextColor(...DOC_COLORS.muted)
    doc.text(`${label}:`, PAGE_MARGIN, y)
    doc.setTextColor(...DOC_COLORS.ink)
    doc.text(value, PAGE_MARGIN + 34, y)
    y += 5
  }

  if (input.consentStatement) {
    y += 2
    doc.setTextColor(...DOC_COLORS.muted)
    doc.setFontSize(8)
    for (const wrapped of doc.splitTextToSize(
      `Agreed to: "${input.consentStatement}"`,
      contentWidth
    ) as string[]) {
      if (y > CONTENT_BOTTOM) nextPage()
      doc.text(wrapped, PAGE_MARGIN, y)
      y += 4
    }
  }

  if (input.contentHash) {
    y += 2
    doc.setFontSize(7)
    doc.setTextColor(...DOC_COLORS.muted)
    doc.text(`Document fingerprint (SHA-256): ${input.contentHash}`, PAGE_MARGIN, y)
  }

  stampFooters(doc, input.organization)
  return doc.output('blob')
}
