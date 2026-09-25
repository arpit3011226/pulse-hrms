import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useUpsertSettlement } from '../hooks/use-alumni'
import {
  DEDUCTION_FIELDS, EARNING_FIELDS, computeNetPayable, type FinalSettlement,
} from '../api/alumni.api'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  settlement: FinalSettlement | null
}

type Amounts = Record<string, string>

export function SettlementDialog({ open, onOpenChange, settlement }: Props) {
  const { data: employees } = useEmployees()
  const upsert = useUpsertSettlement()

  const [employeeId, setEmployeeId] = useState('')
  const [lastWorkingDate, setLastWorkingDate] = useState('')
  const [amounts, setAmounts] = useState<Amounts>({})
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setEmployeeId(settlement?.employee_id ?? '')
    setLastWorkingDate(settlement?.last_working_date ?? '')
    setNotes(settlement?.notes ?? '')
    const next: Amounts = {}
    for (const [f] of [...EARNING_FIELDS, ...DEDUCTION_FIELDS]) {
      const v = settlement?.[f as keyof FinalSettlement]
      next[f] = v != null ? String(v) : ''
    }
    setAmounts(next)
  }, [open, settlement])

  const numeric = Object.fromEntries(
    Object.entries(amounts).map(([k, v]) => [k, Number(v) || 0])
  ) as unknown as Partial<FinalSettlement>

  const totalEarnings = EARNING_FIELDS.reduce((s, [f]) => s + (Number(amounts[f]) || 0), 0)
  const totalDeductions = DEDUCTION_FIELDS.reduce((s, [f]) => s + (Number(amounts[f]) || 0), 0)
  const net = computeNetPayable(numeric)

  // Leavers only — this is a settlement, not a bonus run
  const leavers = (employees ?? []).filter(
    (e) => e.status !== 'active' || e.id === settlement?.employee_id
  )

  async function save() {
    setSaving(true)
    try {
      await upsert.mutateAsync({
        id: settlement?.id,
        employee_id: employeeId,
        last_working_date: lastWorkingDate,
        notes: notes.trim() || null,
        ...numeric,
      })
      toast.success('Settlement saved')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the settlement')
    } finally {
      setSaving(false)
    }
  }

  function field(f: string, label: string) {
    return (
      <div key={f} className="flex items-center justify-between gap-3 py-1.5">
        <Label className="text-sm font-normal">{label}</Label>
        <Input
          type="number"
          className="w-40 text-right"
          value={amounts[f] ?? ''}
          onChange={(e) => setAmounts((p) => ({ ...p, [f]: e.target.value }))}
          placeholder="0"
        />
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle>{settlement ? 'Edit settlement' : 'New full and final settlement'}</DialogTitle>
          <DialogDescription>
            What is owed, what is recovered, and what is left to pay.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 pr-3">
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Select value={employeeId} onValueChange={setEmployeeId} disabled={!!settlement}>
                <SelectTrigger><SelectValue placeholder="Select a leaver" /></SelectTrigger>
                <SelectContent>
                  {leavers.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No one has left yet.
                    </div>
                  ) : (
                    leavers.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.first_name} {e.last_name}
                        {e.employee_code ? ` · ${e.employee_code}` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Last working date *</Label>
              <Input
                type="date"
                value={lastWorkingDate}
                onChange={(e) => setLastWorkingDate(e.target.value)}
              />
            </div>

            <div className="rounded-md border p-3">
              <p className="mb-1 text-sm font-medium text-emerald-700">Owed to them</p>
              {EARNING_FIELDS.map(([f, label]) => field(f, label))}
              <div className="mt-2 flex justify-between border-t pt-2 text-sm">
                <span className="text-muted-foreground">Total earnings</span>
                <span className="font-medium">{formatCurrency(totalEarnings)}</span>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="mb-1 text-sm font-medium text-rose-700">Recovered from them</p>
              {DEDUCTION_FIELDS.map(([f, label]) => field(f, label))}
              <div className="mt-2 flex justify-between border-t pt-2 text-sm">
                <span className="text-muted-foreground">Total deductions</span>
                <span className="font-medium">{formatCurrency(totalDeductions)}</span>
              </div>
            </div>

            <div
              className={`flex items-center justify-between rounded-md border p-3 ${
                net < 0 ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'
              }`}
            >
              <span className="font-medium">
                {net < 0 ? 'Recoverable from employee' : 'Net payable'}
              </span>
              <span className="text-lg font-semibold">{formatCurrency(Math.abs(net))}</span>
            </div>
            {net < 0 && (
              <p className="text-xs text-muted-foreground">
                Deductions exceed earnings, so this is money to collect rather than pay.
              </p>
            )}

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={!employeeId || !lastWorkingDate || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save settlement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
