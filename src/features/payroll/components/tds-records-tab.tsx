import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Calculator, Loader2, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/shared/data-table'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import { useTdsRecords, useTdsCalculation, useUpsertTdsRecord } from '../hooks/use-tax'
import { getCurrentFinancialYear } from '../utils/tax-calculator'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type TdsRow = {
  id: string
  employee_id: string
  financial_year: string
  month: number
  year: number
  taxable_income: number | null
  annual_tax_liability: number | null
  monthly_tds: number | null
  tds_deducted: number | null
  tds_section: string | null
  employee?: {
    id: string; first_name: string; last_name: string; employee_code: string | null
  } | null
}

/** Build the last few financial years, e.g. 2026-27 */
function financialYearOptions(count = 3): string[] {
  const current = getCurrentFinancialYear()
  const startYear = Number(current.split('-')[0])
  return Array.from({ length: count }, (_, i) => {
    const y = startYear - i
    return `${y}-${String(y + 1).slice(2)}`
  })
}

export function TdsRecordsTab() {
  const now = new Date()
  const [financialYear, setFinancialYear] = useState(getCurrentFinancialYear())
  const [computeOpen, setComputeOpen] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [saving, setSaving] = useState(false)

  const { data: records, isLoading } = useTdsRecords(financialYear)
  const { data: employees } = useEmployees()
  const { data: calculation, isLoading: calcLoading } = useTdsCalculation(
    computeOpen ? employeeId : '',
    financialYear
  )
  const upsertRecord = useUpsertTdsRecord()

  const rows = (records ?? []) as TdsRow[]
  const totalTds = rows.reduce((sum, r) => sum + (r.tds_deducted ?? r.monthly_tds ?? 0), 0)

  const columns: ColumnDef<TdsRow>[] = [
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
    {
      id: 'period',
      header: 'Period',
      cell: ({ row }) => `${MONTHS[row.original.month - 1]} ${row.original.year}`,
    },
    {
      accessorKey: 'taxable_income',
      header: 'Taxable Income',
      cell: ({ row }) =>
        row.original.taxable_income != null ? formatCurrency(row.original.taxable_income) : '—',
    },
    {
      accessorKey: 'annual_tax_liability',
      header: 'Annual Liability',
      cell: ({ row }) =>
        row.original.annual_tax_liability != null
          ? formatCurrency(row.original.annual_tax_liability)
          : '—',
    },
    {
      accessorKey: 'monthly_tds',
      header: 'Monthly TDS',
      cell: ({ row }) =>
        row.original.monthly_tds != null ? formatCurrency(row.original.monthly_tds) : '—',
    },
    {
      accessorKey: 'tds_deducted',
      header: 'Deducted',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.tds_deducted != null ? formatCurrency(row.original.tds_deducted) : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'tds_section',
      header: 'Section',
      cell: ({ row }) =>
        row.original.tds_section ? (
          <Badge variant="secondary">{row.original.tds_section}</Badge>
        ) : (
          <Badge variant="outline">192</Badge>
        ),
    },
  ]

  async function handleRecord() {
    if (!employeeId || !calculation) return
    setSaving(true)
    try {
      const year = month >= 4 ? Number(financialYear.split('-')[0]) : Number(financialYear.split('-')[0]) + 1
      await upsertRecord.mutateAsync({
        employee_id: employeeId,
        financial_year: financialYear,
        month,
        year,
        projected_annual_income: calculation.annualIncome,
        total_exemptions: calculation.breakdown?.totalExemptions ?? 0,
        taxable_income: calculation.breakdown?.taxableIncome ?? 0,
        annual_tax_liability: calculation.breakdown?.totalTax ?? null,
        monthly_tds: calculation.monthlyTds,
        tds_deducted: calculation.monthlyTds,
        tds_section: '192',
      } as Parameters<typeof upsertRecord.mutateAsync>[0])
      toast.success('TDS record saved')
      setComputeOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the TDS record')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Financial year</Label>
          <Select value={financialYear} onValueChange={setFinancialYear}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {financialYearOptions().map((fy) => (
                <SelectItem key={fy} value={fy}>{fy}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {rows.length > 0 && (
          <div className="mt-5 text-sm text-muted-foreground">
            Total TDS <span className="font-medium text-foreground">{formatCurrency(totalTds)}</span>
            {' '}across {rows.length} record{rows.length === 1 ? '' : 's'}
          </div>
        )}

        <Button className="ml-auto mt-5" onClick={() => { setEmployeeId(''); setComputeOpen(true) }}>
          <Calculator className="mr-2 h-4 w-4" /> Compute &amp; Record TDS
        </Button>
      </div>

      {!isLoading && rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full bg-violet-50 p-3">
              <Receipt className="h-6 w-6 text-violet-600" />
            </div>
            <p className="font-medium">No TDS records for {financialYear}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Compute TDS for an employee to record what should be deducted each month.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DataTable columns={columns} data={rows} isLoading={isLoading} />
      )}

      {/* Compute and record */}
      <Dialog open={computeOpen} onOpenChange={setComputeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Compute and record TDS</DialogTitle>
            <DialogDescription>
              Works out the monthly TDS under section 192 from the employee's compensation and
              verified declarations for {financialYear}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Employee *</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {(employees ?? [])
                      .filter((e) => e.status === 'active')
                      .map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.first_name} {e.last_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Month *</Label>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {employeeId && (
              <div className="rounded-md border bg-muted/30 p-3">
                {calcLoading ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Working it out…
                  </p>
                ) : calculation ? (
                  <dl className="grid grid-cols-2 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Regime</dt>
                    <dd className="text-right capitalize">{calculation.regime}</dd>
                    <dt className="text-muted-foreground">Annual income</dt>
                    <dd className="text-right">{formatCurrency(calculation.annualIncome)}</dd>
                    <dt className="text-muted-foreground">Exemptions</dt>
                    <dd className="text-right">
                      {formatCurrency(calculation.breakdown?.totalExemptions ?? 0)}
                    </dd>
                    <dt className="text-muted-foreground">Taxable income</dt>
                    <dd className="text-right">
                      {formatCurrency(calculation.breakdown?.taxableIncome ?? 0)}
                    </dd>
                    <dt className="text-muted-foreground">TDS paid so far</dt>
                    <dd className="text-right">{formatCurrency(calculation.tdsPaidSoFar)}</dd>
                    <dt className="text-muted-foreground">Months remaining</dt>
                    <dd className="text-right">{calculation.monthsRemaining}</dd>
                    <dt className="font-medium">Monthly TDS</dt>
                    <dd className="text-right font-medium">
                      {formatCurrency(calculation.monthlyTds)}
                    </dd>
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No compensation found for this employee, so TDS cannot be worked out.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setComputeOpen(false)}>Cancel</Button>
            <Button onClick={handleRecord} disabled={!employeeId || !calculation || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
