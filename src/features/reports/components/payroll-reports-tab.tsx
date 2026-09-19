import { useMemo } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { usePayrollReport } from '../hooks/use-reports'
import { usePermissions } from '@/hooks/use-permissions'
import { exportToCSV } from '../utils/export-csv'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export function PayrollReportsTab() {
  const { data: payslips, isLoading } = usePayrollReport()
  const { hasPermission } = usePermissions()
  const canExport = hasPermission('export_reports')

  const totals = useMemo(() => {
    if (!payslips) return { gross: 0, deductions: 0, net: 0, count: 0 }
    return payslips.reduce(
      (acc, p) => ({
        gross: acc.gross + (p.gross_earnings ?? 0),
        deductions: acc.deductions + (p.total_deductions ?? 0),
        net: acc.net + (p.net_pay ?? 0),
        count: acc.count + 1,
      }),
      { gross: 0, deductions: 0, net: 0, count: 0 }
    )
  }, [payslips])

  const byDepartment = useMemo(() => {
    if (!payslips) return []
    const map = new Map<string, { gross: number; net: number; count: number }>()
    for (const p of payslips) {
      const dept = (p.employee as any)?.department?.name ?? 'Unassigned'
      const existing = map.get(dept) ?? { gross: 0, net: 0, count: 0 }
      map.set(dept, {
        gross: existing.gross + (p.gross_earnings ?? 0),
        net: existing.net + (p.net_pay ?? 0),
        count: existing.count + 1,
      })
    }
    return Array.from(map.entries())
      .map(([dept, stats]) => ({ dept, ...stats }))
      .sort((a, b) => b.net - a.net)
  }, [payslips])

  if (isLoading) return <Skeleton className="h-64" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Total Payslips: {totals.count}</span>
        {canExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToCSV(
                payslips ?? [],
                [
                  { header: 'Employee', accessor: (r: any) => `${r.employee?.first_name} ${r.employee?.last_name}` },
                  { header: 'Code', accessor: (r: any) => r.employee?.employee_code },
                  { header: 'Department', accessor: (r: any) => r.employee?.department?.name },
                  { header: 'Month', accessor: (r: any) => r.payroll_month },
                  { header: 'Year', accessor: (r: any) => r.payroll_year },
                  { header: 'Gross', accessor: (r: any) => r.gross_earnings },
                  { header: 'Deductions', accessor: (r: any) => r.total_deductions },
                  { header: 'Net Pay', accessor: (r: any) => r.net_pay },
                  { header: 'Status', accessor: (r: any) => (r.published_flag ? 'Published' : 'Draft') },
                ],
                'payroll-report'
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{formatCurrency(totals.gross)}</p>
            <p className="text-xs text-muted-foreground">Total Gross</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.deductions)}</p>
            <p className="text-xs text-muted-foreground">Total Deductions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totals.net)}</p>
            <p className="text-xs text-muted-foreground">Total Net Pay</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Payroll by Department</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Payslips</TableHead>
                <TableHead className="text-right">Total Gross</TableHead>
                <TableHead className="text-right">Total Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byDepartment.map((row) => (
                <TableRow key={row.dept}>
                  <TableCell>{row.dept}</TableCell>
                  <TableCell className="text-right">{row.count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.gross)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.net)}</TableCell>
                </TableRow>
              ))}
              {byDepartment.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No payroll data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
