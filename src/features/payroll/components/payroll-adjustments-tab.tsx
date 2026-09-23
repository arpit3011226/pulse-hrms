import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Loader2, Plus, Scale, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import {
  useCurrentEmployee, useSalaryComponents,
  usePayrollAdjustments, useCreatePayrollAdjustment, useDeletePayrollAdjustment,
} from '../hooks/use-payroll'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type AdjustmentRow = {
  id: string
  employee_id: string
  adjustment_type: string
  amount: number
  reason: string
  adjustment_month: number
  adjustment_year: number
  is_processed: boolean | null
  created_at: string
  employee?: { id: string; first_name: string; last_name: string } | null
}

export function PayrollAdjustmentsTab() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const { data: adjustments, isLoading } = usePayrollAdjustments(month, year)
  const { data: employees } = useEmployees()
  const { data: components } = useSalaryComponents()
  const { data: me } = useCurrentEmployee()
  const createAdjustment = useCreatePayrollAdjustment()
  const deleteAdjustment = useDeletePayrollAdjustment()

  const [formOpen, setFormOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // form state
  const [employeeId, setEmployeeId] = useState('')
  const [type, setType] = useState<'addition' | 'deduction'>('addition')
  const [componentId, setComponentId] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!formOpen) return
    setEmployeeId(''); setType('addition'); setComponentId('')
    setAmount(''); setReason('')
  }, [formOpen])

  const rows = (adjustments ?? []) as AdjustmentRow[]
  const yearOptions = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2]

  const totals = rows.reduce(
    (acc, r) => {
      if (r.adjustment_type === 'deduction') acc.deductions += r.amount
      else acc.additions += r.amount
      return acc
    },
    { additions: 0, deductions: 0 }
  )

  const amountNum = Number(amount)
  const canSave =
    !!employeeId && !!reason.trim() && Number.isFinite(amountNum) && amountNum > 0 && !saving

  async function handleSave() {
    setSaving(true)
    try {
      await createAdjustment.mutateAsync({
        employee_id: employeeId,
        adjustment_type: type,
        salary_component_id: componentId || null,
        amount: amountNum,
        reason: reason.trim(),
        adjustment_month: month,
        adjustment_year: year,
        created_by: me?.id,
      })
      toast.success('Adjustment added')
      setFormOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add the adjustment')
    } finally {
      setSaving(false)
    }
  }

  const columns: ColumnDef<AdjustmentRow>[] = [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const e = row.original.employee
        return e ? `${e.first_name} ${e.last_name}` : '—'
      },
    },
    {
      accessorKey: 'adjustment_type',
      header: 'Type',
      cell: ({ row }) =>
        row.original.adjustment_type === 'deduction' ? (
          <Badge className="bg-rose-100 text-rose-800">Deduction</Badge>
        ) : (
          <Badge className="bg-emerald-100 text-emerald-800">Addition</Badge>
        ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span
          className={
            row.original.adjustment_type === 'deduction'
              ? 'font-medium text-rose-600'
              : 'font-medium text-emerald-600'
          }
        >
          {row.original.adjustment_type === 'deduction' ? '−' : '+'}
          {formatCurrency(row.original.amount)}
        </span>
      ),
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      cell: ({ row }) => <span className="line-clamp-2 max-w-sm text-sm">{row.original.reason}</span>,
    },
    {
      accessorKey: 'is_processed',
      header: 'Processed',
      cell: ({ row }) =>
        row.original.is_processed ? (
          <Badge variant="secondary">In payroll</Badge>
        ) : (
          <Badge variant="outline">Pending</Badge>
        ),
    },
    {
      accessorKey: 'created_at',
      header: 'Added',
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: 'actions',
      cell: ({ row }) =>
        row.original.is_processed ? null : (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={() => setDeleteId(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
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

        {rows.length > 0 && (
          <div className="flex gap-6 text-sm">
            <span className="text-muted-foreground">
              Additions <span className="font-medium text-emerald-600">{formatCurrency(totals.additions)}</span>
            </span>
            <span className="text-muted-foreground">
              Deductions <span className="font-medium text-rose-600">{formatCurrency(totals.deductions)}</span>
            </span>
          </div>
        )}

        <Button className="ml-auto" onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Adjustment
        </Button>
      </div>

      {!isLoading && rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full bg-amber-50 p-3">
              <Scale className="h-6 w-6 text-amber-600" />
            </div>
            <p className="font-medium">No adjustments for {MONTHS[month - 1]} {year}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use adjustments for one-off additions or deductions such as a bonus, an arrear or a
              recovery. They are picked up by the payroll run for that month.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DataTable columns={columns} data={rows} isLoading={isLoading} />
      )}

      {/* Add adjustment */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add adjustment</DialogTitle>
            <DialogDescription>
              A one-off addition or deduction for {MONTHS[month - 1]} {year}. It is applied when
              payroll is computed for that month.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {(employees ?? [])
                    .filter((e) => e.status === 'active')
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.first_name} {e.last_name}
                        {e.employee_code ? ` · ${e.employee_code}` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Select value={type} onValueChange={(v) => setType(v as 'addition' | 'deduction')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="addition">Addition</SelectItem>
                    <SelectItem value="deduction">Deduction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Salary component</Label>
              <Select value={componentId} onValueChange={setComponentId}>
                <SelectTrigger><SelectValue placeholder="Optional — leave blank for ad-hoc" /></SelectTrigger>
                <SelectContent>
                  {(components ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Reason *</Label>
              <Textarea
                placeholder="e.g. Performance bonus for Q2, or recovery of notice period shortfall"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete adjustment"
        description="This adjustment will be removed and will not be applied in the payroll run."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          try {
            await deleteAdjustment.mutateAsync(deleteId!)
            toast.success('Adjustment deleted')
          } catch {
            toast.error('Could not delete the adjustment')
          } finally {
            setDeleteId(null)
          }
        }}
      />
    </div>
  )
}
