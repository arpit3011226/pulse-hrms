import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Eye, FileText, FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/shared/data-table'
import { PayslipViewDialog } from './payslip-view-dialog'
import { useAllPayslips } from '../hooks/use-payroll'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { exportPayrollForAgency } from '../utils/agency-export'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Payslip } from '@/types/database.types'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type PayslipRow = Payslip & {
  employee?: {
    id: string
    first_name: string
    last_name: string
    email: string
    employee_code: string | null
  } | null
}

export function AllPayslipsTab() {
  const now = new Date()
  const [month, setMonth] = useState<number>(now.getMonth() + 1)
  const [year, setYear] = useState<number>(now.getFullYear())
  const [viewPayslip, setViewPayslip] = useState<Payslip | null>(null)
  const [exporting, setExporting] = useState(false)
  const { organization } = useAuth()

  const { data: payslips, isLoading } = useAllPayslips(month, year)
  const rows = (payslips ?? []) as PayslipRow[]

  const yearOptions = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2]

  const totals = rows.reduce(
    (acc, p) => ({
      gross: acc.gross + (p.gross_earnings ?? 0),
      deductions: acc.deductions + (p.total_deductions ?? 0),
      net: acc.net + (p.net_pay ?? 0),
    }),
    { gross: 0, deductions: 0, net: 0 }
  )

  const columns: ColumnDef<PayslipRow>[] = [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const e = row.original.employee
        return (
          <div>
            <p className="font-medium">{e ? `${e.first_name} ${e.last_name}` : '—'}</p>
            <p className="text-xs text-muted-foreground">{e?.employee_code ?? '—'}</p>
          </div>
        )
      },
    },
    { accessorKey: 'payslip_number', header: 'Payslip No.' },
    {
      accessorKey: 'gross_earnings',
      header: 'Gross',
      cell: ({ row }) => formatCurrency(row.original.gross_earnings ?? 0),
    },
    {
      accessorKey: 'total_deductions',
      header: 'Deductions',
      cell: ({ row }) => formatCurrency(row.original.total_deductions ?? 0),
    },
    {
      accessorKey: 'net_pay',
      header: 'Net Pay',
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.net_pay ?? 0)}</span>
      ),
    },
    {
      accessorKey: 'published_flag',
      header: 'Status',
      cell: ({ row }) =>
        row.original.published_flag ? (
          <Badge className="bg-emerald-100 text-emerald-800">Published</Badge>
        ) : (
          <Badge variant="secondary">Draft</Badge>
        ),
    },
    {
      accessorKey: 'generated_on',
      header: 'Generated',
      cell: ({ row }) =>
        row.original.generated_on ? formatDate(row.original.generated_on) : '—',
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => setViewPayslip(row.original)}>
          <Eye className="mr-1.5 h-3.5 w-3.5" /> View
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={exporting}
          onClick={async () => {
            setExporting(true)
            try {
              const r = await exportPayrollForAgency(organization!.id, month, year)
              toast.success(
                `Exported ${r.rowCount} payslip${r.rowCount === 1 ? '' : 's'}, ${r.joiners} joiner${r.joiners === 1 ? '' : 's'}, ${r.leavers} leaver${r.leavers === 1 ? '' : 's'}`
              )
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Could not build the export')
            } finally {
              setExporting(false)
            }
          }}
        >
          {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
          Export for agency
        </Button>

        {rows.length > 0 && (
          <div className="ml-auto flex gap-6 text-sm">
            <span className="text-muted-foreground">
              Gross <span className="font-medium text-foreground">{formatCurrency(totals.gross)}</span>
            </span>
            <span className="text-muted-foreground">
              Deductions <span className="font-medium text-foreground">{formatCurrency(totals.deductions)}</span>
            </span>
            <span className="text-muted-foreground">
              Net <span className="font-medium text-foreground">{formatCurrency(totals.net)}</span>
            </span>
          </div>
        )}
      </div>

      {!isLoading && rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full bg-blue-50 p-3">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <p className="font-medium">No payslips for {MONTHS[month - 1]} {year}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Payslips appear here once a payroll run has generated them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DataTable columns={columns} data={rows} isLoading={isLoading} />
      )}

      <PayslipViewDialog
        open={!!viewPayslip}
        onOpenChange={(open) => !open && setViewPayslip(null)}
        payslip={viewPayslip}
      />
    </div>
  )
}
