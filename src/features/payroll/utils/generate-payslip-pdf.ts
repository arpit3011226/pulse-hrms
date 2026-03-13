import jsPDF from 'jspdf'
import { getMonthName } from './payroll-utils'
import { numberToWords } from './number-to-words'
import type { Organization } from '@/types/database.types'

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

const COMPANY_ADDRESS = '4th Floor, #597, 15th Cross Road, Outer Ring Rd, MG Layout, JP Nagar Phase 6, J. P. Nagar, Bengaluru, Karnataka 560078'

const COLORS = {
  primary: [50, 50, 55] as [number, number, number],       // Dark charcoal
  dark: [30, 30, 30] as [number, number, number],
  muted: [100, 100, 100] as [number, number, number],
  light: [245, 245, 247] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  border: [210, 210, 215] as [number, number, number],
  accent: [180, 40, 100] as [number, number, number],      // August magenta/pink
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

/** Draw the August logo — concentric circles target icon */
function drawAugustLogo(doc: jsPDF, x: number, y: number, size: number) {
  const cx = x + size / 2
  const cy = y + size / 2
  const r = size / 2

  // Outer circle
  doc.setDrawColor(180, 40, 100)
  doc.setLineWidth(1.2)
  doc.setFillColor(255, 255, 255)
  doc.circle(cx, cy, r, 'FD')

  // Middle ring
  doc.setLineWidth(1.0)
  doc.circle(cx, cy, r * 0.65, 'D')

  // Inner filled circle
  doc.setFillColor(180, 40, 100)
  doc.circle(cx, cy, r * 0.3, 'F')
}

export function generatePayslipPdf(data: PayslipPdfData, organization: Organization): void {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = 210
  const margin = 16
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // ── Header: Company branding ──
  doc.setFillColor(...COLORS.primary)
  doc.rect(0, 0, pageWidth, 38, 'F')

  // Draw August logo
  drawAugustLogo(doc, margin, 5, 12)

  // Company name next to logo
  doc.setTextColor(...COLORS.white)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(organization.name || 'Augustinnovate Pvt. Ltd.', margin + 16, 14)

  // Company address
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text(COMPANY_ADDRESS, margin + 16, 20)

  // Website only (no phone/email)
  if (organization.website) {
    doc.text(organization.website, margin + 16, 25)
  }

  // Payslip title on right
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('PAYSLIP', pageWidth - margin, 14, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`${getMonthName(data.payroll_month)} ${data.payroll_year}`, pageWidth - margin, 21, { align: 'right' })
  doc.setFontSize(8)
  doc.text(data.payslip_number, pageWidth - margin, 27, { align: 'right' })

  y = 45

  // ── Employee Details Section ──
  const emp = data.employee
  doc.setFillColor(...COLORS.light)
  doc.roundedRect(margin, y, contentWidth, 46, 2, 2, 'F')

  doc.setTextColor(...COLORS.muted)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('EMPLOYEE DETAILS', margin + 4, y + 5)

  const col1x = margin + 4
  const col2x = margin + contentWidth / 3
  const col3x = margin + (contentWidth / 3) * 2
  const labelY = y + 11
  const valueY = y + 15

  const drawField = (label: string, value: string, x: number, ly: number, vy: number) => {
    doc.setTextColor(...COLORS.muted)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.text(label, x, ly)
    doc.setTextColor(...COLORS.dark)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(value || '-', x, vy)
  }

  // Row 1
  drawField('Employee Name', emp ? `${emp.first_name} ${emp.last_name}` : '-', col1x, labelY, valueY)
  drawField('Employee Code', emp?.employee_code || '-', col2x, labelY, valueY)
  drawField('Department', emp?.department?.name || '-', col3x, labelY, valueY)

  // Row 2
  const r2ly = labelY + 10
  const r2vy = valueY + 10
  drawField('Designation', emp?.designation?.title || '-', col1x, r2ly, r2vy)
  drawField('Date of Joining', formatDateShort(emp?.date_of_joining || null), col2x, r2ly, r2vy)
  drawField('PAN', emp?.pan_number || '-', col3x, r2ly, r2vy)

  // Row 3
  const r3ly = r2ly + 10
  const r3vy = r2vy + 10
  drawField('Bank A/C', maskBankAccount(emp?.bank_details?.account_number), col1x, r3ly, r3vy)
  drawField('UAN', emp?.uan_number || '-', col2x, r3ly, r3vy)
  drawField('Working Days', String(data.working_days ?? '-'), col3x, r3ly, r3vy)

  // Row 4
  const r4ly = r3ly + 10
  const r4vy = r3vy + 10
  drawField('LOP Days', String(data.lop_days ?? '0'), col1x, r4ly, r4vy)
  drawField('Present Days', String(data.present_days ?? '-'), col2x, r4ly, r4vy)

  y += 52

  // ── Earnings & Deductions Table ──
  const tableWidth = contentWidth
  const halfWidth = tableWidth / 2
  const earningsX = margin
  const deductionsX = margin + halfWidth

  // Table header
  doc.setFillColor(...COLORS.primary)
  doc.rect(earningsX, y, halfWidth, 7, 'F')
  doc.rect(deductionsX, y, halfWidth, 7, 'F')

  doc.setTextColor(...COLORS.white)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('EARNINGS', earningsX + 4, y + 5)
  doc.text('Amount (INR)', earningsX + halfWidth - 6, y + 5, { align: 'right' })
  doc.text('DEDUCTIONS', deductionsX + 4, y + 5)
  doc.text('Amount (INR)', deductionsX + halfWidth - 6, y + 5, { align: 'right' })
  y += 7

  // Table rows
  const sortedEarnings = [...data.earnings].sort((a, b) =>
    (a.salary_component?.component_name || '').localeCompare(b.salary_component?.component_name || ''))
  const sortedDeductions = [...data.deductions].sort((a, b) =>
    (a.salary_component?.component_name || '').localeCompare(b.salary_component?.component_name || ''))

  const maxRows = Math.max(sortedEarnings.length, sortedDeductions.length, 1)
  const rowHeight = 6

  for (let i = 0; i < maxRows; i++) {
    const rowY = y + i * rowHeight
    const bgColor = i % 2 === 0 ? COLORS.white : COLORS.light
    doc.setFillColor(...bgColor)
    doc.rect(earningsX, rowY, halfWidth, rowHeight, 'F')
    doc.rect(deductionsX, rowY, halfWidth, rowHeight, 'F')

    // Border between left and right
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.3)
    doc.line(deductionsX, rowY, deductionsX, rowY + rowHeight)

    doc.setFontSize(7.5)

    // Earning row
    if (i < sortedEarnings.length) {
      const e = sortedEarnings[i]
      doc.setTextColor(...COLORS.dark)
      doc.setFont('helvetica', 'normal')
      doc.text(e.salary_component?.component_name || '-', earningsX + 4, rowY + 4)
      doc.setFont('helvetica', 'bold')
      doc.text(formatAmount(e.amount), earningsX + halfWidth - 6, rowY + 4, { align: 'right' })
    }

    // Deduction row
    if (i < sortedDeductions.length) {
      const d = sortedDeductions[i]
      doc.setTextColor(...COLORS.dark)
      doc.setFont('helvetica', 'normal')
      doc.text(d.salary_component?.component_name || '-', deductionsX + 4, rowY + 4)
      doc.setFont('helvetica', 'bold')
      doc.text(formatAmount(d.amount), deductionsX + halfWidth - 6, rowY + 4, { align: 'right' })
    }
  }

  y += maxRows * rowHeight

  // Table border
  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.3)
  doc.rect(earningsX, y - maxRows * rowHeight, tableWidth, maxRows * rowHeight)

  // Totals row
  doc.setFillColor(...COLORS.light)
  doc.rect(earningsX, y, halfWidth, 7, 'F')
  doc.rect(deductionsX, y, halfWidth, 7, 'F')
  doc.setDrawColor(...COLORS.primary)
  doc.setLineWidth(0.5)
  doc.line(earningsX, y, earningsX + tableWidth, y)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.dark)
  doc.text('Total Earnings', earningsX + 4, y + 5)
  doc.text(formatAmount(data.gross_earnings), earningsX + halfWidth - 6, y + 5, { align: 'right' })
  doc.text('Total Deductions', deductionsX + 4, y + 5)
  doc.text(formatAmount(data.total_deductions), deductionsX + halfWidth - 6, y + 5, { align: 'right' })

  y += 12

  // ── Net Pay Box ──
  doc.setFillColor(...COLORS.primary)
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'F')

  doc.setTextColor(...COLORS.white)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('NET PAY', margin + 4, y + 7)
  doc.setFontSize(14)
  doc.text(formatAmount(data.net_pay), pageWidth - margin - 6, y + 8, { align: 'right' })

  // Amount in words
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(numberToWords(data.net_pay), margin + 4, y + 13)

  y += 22

  // ── Footer ──
  const footerY = 270

  // Separator line
  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.3)
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)

  doc.setTextColor(...COLORS.muted)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'italic')
  doc.text(
    'This is a computer-generated payslip and does not require a signature.',
    pageWidth / 2, footerY, { align: 'center' }
  )

  doc.setFont('helvetica', 'normal')
  doc.text(
    `Generated on: ${formatDateShort(data.generated_on)}  |  ${organization.name || 'Augustinnovate Pvt. Ltd.'}  |  Confidential`,
    pageWidth / 2, footerY + 4, { align: 'center' }
  )

  doc.text(
    COMPANY_ADDRESS,
    pageWidth / 2, footerY + 8, { align: 'center' }
  )

  // Download
  const filename = `Payslip_${data.payslip_number}_${getMonthName(data.payroll_month)}_${data.payroll_year}.pdf`
  doc.save(filename)
}
