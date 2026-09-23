import { supabase } from '@/lib/supabase'

/**
 * F41 — monthly payroll export for the outsourced agency.
 *
 * Form 16, PF ECR and ESI returns are handled by an agency, so Pulse does not
 * produce those filings. What it must do is hand over clean monthly data:
 * who was paid, how much, what was deducted, who joined and who left.
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function csvCell(value: unknown): string {
  if (value == null) return ''
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n')
}

function download(filename: string, csv: string) {
  // Byte order mark so Excel opens Indian names and the rupee sign correctly
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export interface AgencyExportResult {
  rowCount: number
  joiners: number
  leavers: number
}

export async function exportPayrollForAgency(
  orgId: string,
  month: number,
  year: number
): Promise<AgencyExportResult> {
  // Payslips carry the final figures for the month
  const { data: payslips, error } = await supabase
    .from('payslips')
    .select('payslip_number, payroll_month, payroll_year, gross_earnings, total_deductions, net_pay, employee:employees!payslips_employee_id_fkey(id, first_name, last_name, employee_code, date_of_joining, pan_number, uan_number, personal_email, department:departments!department_id(name), designation:designations!designation_id(title))')
    .eq('organization_id', orgId)
    .eq('payroll_month', month)
    .eq('payroll_year', year)
  if (error) throw error

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = new Date(year, month, 0).toISOString().split('T')[0]

  // TDS for the same month, so the agency does not have to recompute it
  const { data: tds } = await supabase
    .from('employee_tds_records')
    .select('employee_id, monthly_tds, tds_deducted, tds_section')
    .eq('organization_id', orgId)
    .eq('month', month)
    .eq('year', year)
  const tdsByEmployee = new Map(
    (tds ?? []).map((t) => [t.employee_id as string, t])
  )

  const [{ data: joiners }, { data: leavers }] = await Promise.all([
    supabase
      .from('employees')
      .select('first_name, last_name, employee_code, date_of_joining')
      .eq('organization_id', orgId)
      .gte('date_of_joining', monthStart)
      .lte('date_of_joining', monthEnd),
    supabase
      .from('employee_exit_records')
      .select('last_working_date, exit_type, employee:employees!employee_exit_records_employee_id_fkey(first_name, last_name, employee_code)')
      .eq('organization_id', orgId)
      .gte('last_working_date', monthStart)
      .lte('last_working_date', monthEnd),
  ])

  const rows = (payslips ?? []).map((p) => {
    const e = p.employee as unknown as Record<string, unknown> | null
    const t = e ? tdsByEmployee.get(e.id as string) : undefined
    return [
      e?.employee_code ?? '',
      e ? `${e.first_name} ${e.last_name}` : '',
      (e?.department as Record<string, unknown> | null)?.name ?? '',
      (e?.designation as Record<string, unknown> | null)?.title ?? '',
      e?.pan_number ?? '',
      e?.uan_number ?? '',
      e?.date_of_joining ?? '',
      p.payslip_number ?? '',
      p.gross_earnings ?? 0,
      p.total_deductions ?? 0,
      t?.tds_deducted ?? t?.monthly_tds ?? 0,
      t?.tds_section ?? '192',
      p.net_pay ?? 0,
    ]
  })

  const headers = [
    'Employee Code', 'Name', 'Department', 'Designation', 'PAN', 'UAN',
    'Date of Joining', 'Payslip No', 'Gross Earnings', 'Total Deductions',
    'TDS', 'TDS Section', 'Net Pay',
  ]

  const label = `${MONTHS[month - 1]}-${year}`
  let csv = `Payroll data for ${label}\n\n` + toCsv(headers, rows)

  if ((joiners ?? []).length > 0) {
    csv += '\n\nJoiners this month\n'
    csv += toCsv(
      ['Employee Code', 'Name', 'Date of Joining'],
      (joiners ?? []).map((j) => [
        j.employee_code ?? '',
        `${j.first_name} ${j.last_name}`,
        j.date_of_joining ?? '',
      ])
    )
  }

  if ((leavers ?? []).length > 0) {
    csv += '\n\nLeavers this month\n'
    csv += toCsv(
      ['Employee Code', 'Name', 'Last Working Day', 'Exit Type'],
      (leavers ?? []).map((l) => {
        const e = l.employee as unknown as Record<string, unknown> | null
        return [
          e?.employee_code ?? '',
          e ? `${e.first_name} ${e.last_name}` : '',
          l.last_working_date ?? '',
          l.exit_type ?? '',
        ]
      })
    )
  }

  download(`payroll-agency-${label.toLowerCase()}.csv`, csv)

  return {
    rowCount: rows.length,
    joiners: (joiners ?? []).length,
    leavers: (leavers ?? []).length,
  }
}
