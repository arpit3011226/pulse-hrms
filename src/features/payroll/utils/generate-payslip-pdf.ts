import jsPDF from 'jspdf'
import { getMonthName } from './payroll-utils'
import { numberToWords } from './number-to-words'
import type { Organization } from '@/types/database.types'
import {
  AUGUST_ROSE,
  companyAddress,
  companyName,
  drawAugustLogo,
  stampFooters,
} from '@/lib/document-branding'

interface PayslipEarning {
  amount: number
  salary_component: { component_name: string; component_code: string } | null
}

interface PayslipDeduction {
  amount: number
  salary_component: { component_name: string; component_code: string } | null
}

interface PayslipEmployee {
  first_name: string
  last_name: string
  email: string
  employee_code: string | null
  date_of_joining: string | null
  pan_number: string | null
  uan_number: string | null
  bank_details: Record<string, string> | null
  department: { name: string } | null
  designation: { title: string } | null
}

export interface PayslipPdfData {
  payslip_number: string
  payroll_month: number
  payroll_year: number
  gross_earnings: number
  total_deductions: number
  net_pay: number
  generated_on: string
  working_days: number | null
  present_days: number | null
  lop_days: number | null
  employee: PayslipEmployee | null
  earnings: PayslipEarning[]
  deductions: PayslipDeduction[]
}

// Clean professional color palette — August brand
const C = {
  black: [20, 20, 20] as [number, number, number],
  dark: [40, 40, 45] as [number, number, number],
  text: [55, 55, 60] as [number, number, number],
  muted: [120, 120, 130] as [number, number, number],
  light: [245, 245, 248] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  border: [215, 215, 220] as [number, number, number],
  // August brand rose, sampled from the design system artwork
  august: AUGUST_ROSE,
  augustLight: [252, 235, 243] as [number, number, number],
  // Accent = August brand
  accent: AUGUST_ROSE,
  accentBg: [252, 235, 243] as [number, number, number],
  greenBg: [236, 253, 245] as [number, number, number],
  green: [16, 185, 129] as [number, number, number],
}

/** Format number in Indian comma style without currency symbol */
function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function maskBankAccount(account: string | undefined): string {
  if (!account || account.length < 4) return account || '-'
  return 'XXXX' + account.slice(-4)
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function generatePayslipPdf(data: PayslipPdfData, organization: Organization): void {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = 210
  const margin = 16
  const contentWidth = pageWidth - margin * 2
  let y = 0

  // ── Thin accent line at top ──
  doc.setFillColor(...C.august)
  doc.rect(0, 0, pageWidth, 2, 'F')

  y = 8

  // ── Header: Company branding (white background) ──
  // The logo already carries the AUGUST wordmark, so the registered name sits
  // underneath it in small type rather than beside it in large type.
  const logoHeight = drawAugustLogo(doc, margin, y, 36)

  doc.setTextColor(...C.black)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.text(companyName(organization), margin, y + logoHeight + 4.5)

  // Company address
  doc.setTextColor(...C.muted)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  const addressLines = doc.splitTextToSize(companyAddress(organization), 100) as string[]
  doc.text(addressLines, margin, y + logoHeight + 8.5)

  // Website
  if (organization.website) {
    doc.setTextColor(...C.accent)
    doc.setFontSize(7)
    doc.text(organization.website, margin, y + logoHeight + 8.5 + addressLines.length * 3.5)
  }

  // Right side — PAYSLIP badge
  doc.setFillColor(...C.accentBg)
  doc.roundedRect(pageWidth - margin - 48, y - 1, 48, 10, 2, 2, 'F')
  doc.setTextColor(...C.accent)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('PAYSLIP', pageWidth - margin - 24, y + 6, { align: 'center' })

  // Month/year and payslip number
  doc.setTextColor(...C.dark)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`${getMonthName(data.payroll_month)} ${data.payroll_year}`, pageWidth - margin, y + 16, { align: 'right' })
  doc.setTextColor(...C.muted)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text(data.payslip_number, pageWidth - margin, y + 21, { align: 'right' })

  y += 30

  // ── Separator line ──
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageWidth - margin, y)

  y += 6

  // ── Employee Details Section ──
  doc.setFillColor(...C.light)
  doc.roundedRect(margin, y, contentWidth, 40, 2, 2, 'F')

  // Section title
  doc.setTextColor(...C.accent)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text('EMPLOYEE DETAILS', margin + 5, y + 6)

  const emp = data.employee
  const col1x = margin + 5
  const col2x = margin + contentWidth / 3
  const col3x = margin + (contentWidth / 3) * 2

  const drawField = (label: string, value: string, x: number, ly: number, vy: number) => {
    doc.setTextColor(...C.muted)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.text(label, x, ly)
    doc.setTextColor(...C.dark)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(value || '-', x, vy)
  }

  // Row 1
  const r1ly = y + 12
  const r1vy = y + 16
  drawField('Employee Name', emp ? `${emp.first_name} ${emp.last_name}` : '-', col1x, r1ly, r1vy)
  drawField('Employee Code', emp?.employee_code || '-', col2x, r1ly, r1vy)
  drawField('Department', emp?.department?.name || '-', col3x, r1ly, r1vy)

  // Row 2
  const r2ly = r1ly + 9
  const r2vy = r1vy + 9
  drawField('Designation', emp?.designation?.title || '-', col1x, r2ly, r2vy)
  drawField('Date of Joining', formatDateShort(emp?.date_of_joining || null), col2x, r2ly, r2vy)
  drawField('PAN', emp?.pan_number || '-', col3x, r2ly, r2vy)

  // Row 3
  const r3ly = r2ly + 9
  const r3vy = r2vy + 9
  drawField('Bank A/C', maskBankAccount(emp?.bank_details?.account_number), col1x, r3ly, r3vy)
  drawField('UAN', emp?.uan_number || '-', col2x, r3ly, r3vy)
  drawField('Working Days', String(data.working_days ?? '-'), col3x, r3ly, r3vy)

  y += 46

  // ── Attendance Summary (small row) ──
  const attendRow = [
    { label: 'Present Days', value: String(data.present_days ?? '-') },
    { label: 'LOP Days', value: String(data.lop_days ?? '0') },
    { label: 'Pay Period', value: `${getMonthName(data.payroll_month)} ${data.payroll_year}` },
  ]

  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.2)
  const attColWidth = contentWidth / attendRow.length
  for (let i = 0; i < attendRow.length; i++) {
    const ax = margin + i * attColWidth
    doc.setFillColor(...C.white)
    doc.rect(ax, y, attColWidth, 10, 'FD')
    doc.setTextColor(...C.muted)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.text(attendRow[i].label, ax + 4, y + 4)
    doc.setTextColor(...C.dark)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(attendRow[i].value, ax + 4, y + 8.5)
  }

  y += 15

  // ── Earnings & Deductions Table ──
  const tableWidth = contentWidth
  const halfWidth = tableWidth / 2
  const earningsX = margin
  const deductionsX = margin + halfWidth

  // Table header
  doc.setFillColor(...C.accent)
  doc.roundedRect(earningsX, y, halfWidth - 0.5, 8, 1.5, 1.5, 'F')
  doc.setFillColor(...C.accent)
  doc.roundedRect(deductionsX + 0.5, y, halfWidth - 0.5, 8, 1.5, 1.5, 'F')

  doc.setTextColor(...C.white)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text('EARNINGS', earningsX + 5, y + 5.5)
  doc.text('Amount', earningsX + halfWidth - 7, y + 5.5, { align: 'right' })
  doc.text('DEDUCTIONS', deductionsX + 5, y + 5.5)
  doc.text('Amount', deductionsX + halfWidth - 7, y + 5.5, { align: 'right' })
  y += 8

  // Table rows
  const sortedEarnings = [...data.earnings].sort((a, b) =>
    (a.salary_component?.component_name || '').localeCompare(b.salary_component?.component_name || ''))
  const sortedDeductions = [...data.deductions].sort((a, b) =>
    (a.salary_component?.component_name || '').localeCompare(b.salary_component?.component_name || ''))

  const maxRows = Math.max(sortedEarnings.length, sortedDeductions.length, 1)
  const rowHeight = 7

  for (let i = 0; i < maxRows; i++) {
    const rowY = y + i * rowHeight
    const bgColor = i % 2 === 0 ? C.white : C.light
    doc.setFillColor(...bgColor)
    doc.rect(earningsX, rowY, halfWidth, rowHeight, 'F')
    doc.rect(deductionsX, rowY, halfWidth, rowHeight, 'F')

    // Vertical divider
    doc.setDrawColor(...C.border)
    doc.setLineWidth(0.3)
    doc.line(deductionsX, rowY, deductionsX, rowY + rowHeight)

    doc.setFontSize(7.5)

    // Earning row
    if (i < sortedEarnings.length) {
      const e = sortedEarnings[i]
      doc.setTextColor(...C.text)
      doc.setFont('helvetica', 'normal')
      doc.text(e.salary_component?.component_name || '-', earningsX + 5, rowY + 4.5)
      doc.setTextColor(...C.dark)
      doc.setFont('helvetica', 'bold')
      doc.text(formatAmount(e.amount), earningsX + halfWidth - 7, rowY + 4.5, { align: 'right' })
    }

    // Deduction row
    if (i < sortedDeductions.length) {
      const d = sortedDeductions[i]
      doc.setTextColor(...C.text)
      doc.setFont('helvetica', 'normal')
      doc.text(d.salary_component?.component_name || '-', deductionsX + 5, rowY + 4.5)
      doc.setTextColor(...C.dark)
      doc.setFont('helvetica', 'bold')
      doc.text(formatAmount(d.amount), deductionsX + halfWidth - 7, rowY + 4.5, { align: 'right' })
    }
  }

  y += maxRows * rowHeight

  // Table outer border
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.rect(earningsX, y - maxRows * rowHeight, tableWidth, maxRows * rowHeight)

  // ── Totals row ──
  doc.setFillColor(...C.light)
  doc.rect(earningsX, y, halfWidth, 8, 'F')
  doc.rect(deductionsX, y, halfWidth, 8, 'F')
  doc.setDrawColor(...C.accent)
  doc.setLineWidth(0.5)
  doc.line(earningsX, y, earningsX + tableWidth, y)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.dark)
  doc.text('Total Earnings', earningsX + 5, y + 5.5)
  doc.setTextColor(...C.accent)
  doc.text(formatAmount(data.gross_earnings), earningsX + halfWidth - 7, y + 5.5, { align: 'right' })
  doc.setTextColor(...C.dark)
  doc.text('Total Deductions', deductionsX + 5, y + 5.5)
  doc.setTextColor(220, 50, 50)
  doc.text(formatAmount(data.total_deductions), deductionsX + halfWidth - 7, y + 5.5, { align: 'right' })

  y += 14

  // ── Net Pay Box ──
  doc.setFillColor(...C.greenBg)
  doc.setDrawColor(...C.green)
  doc.setLineWidth(0.5)
  doc.roundedRect(margin, y, contentWidth, 18, 3, 3, 'FD')

  doc.setTextColor(...C.text)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('NET PAY', margin + 6, y + 7)

  // Currency symbol + amount
  doc.setTextColor(16, 150, 110)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`INR ${formatAmount(data.net_pay)}`, pageWidth - margin - 6, y + 8, { align: 'right' })

  // Amount in words
  doc.setTextColor(...C.muted)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.text(numberToWords(data.net_pay), margin + 6, y + 14)

  y += 24

  // ── Footer ──
  // Payslip-specific line; the shared footer underneath carries the copyright,
  // address, CIN and the computer-generated note.
  doc.setTextColor(...C.muted)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Generated on: ${formatDateShort(data.generated_on)}  |  Confidential`,
    pageWidth / 2, 262, { align: 'center' }
  )

  stampFooters(doc, organization, { margin, showComputerGeneratedNote: true })

  // Download
  const filename = `Payslip_${data.payslip_number}_${getMonthName(data.payroll_month)}_${data.payroll_year}.pdf`
  doc.save(filename)
}
