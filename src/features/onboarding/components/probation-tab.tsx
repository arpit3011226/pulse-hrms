import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { BadgeCheck, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/shared/data-table'
import { useProbationDue, useConfirmEmployee } from '../hooks/use-onboarding'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

type ProbationRow = {
  id: string
  first_name: string
  last_name: string
  employee_code: string | null
  date_of_joining: string | null
  probation_end_date: string
  days_left: number
  is_overdue: boolean
  department?: { id: string; name: string } | null
  designation?: { id: string; title: string } | null
}

const WINDOWS = [
  { value: '30', label: 'Next 30 days' },
  { value: '60', label: 'Next 60 days' },
  { value: '90', label: 'Next 90 days' },
  { value: '3650', label: 'All pending' },
]

export function ProbationTab({ canManage }: { canManage: boolean }) {
  const [window, setWindow] = useState('30')
  const { data, isLoading } = useProbationDue(Number(window))
  const confirmEmployee = useConfirmEmployee()

  const [target, setTarget] = useState<ProbationRow | null>(null)
  const [confirmationDate, setConfirmationDate] = useState('')
  const [saving, setSaving] = useState(false)

  const rows = (data ?? []) as unknown as ProbationRow[]
  const overdue = rows.filter((r) => r.is_overdue).length

  function openConfirm(row: ProbationRow) {
    setTarget(row)
    // Default to the probation end date, not today — that is the real date
    setConfirmationDate(row.probation_end_date)
  }

  async function handleConfirm() {
    if (!target) return
    setSaving(true)
    try {
      await confirmEmployee.mutateAsync({
        employeeId: target.id,
        confirmationDate,
      })
      toast.success(`${target.first_name} confirmed`)
      setTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not confirm the employee')
    } finally {
      setSaving(false)
    }
  }

  const columns: ColumnDef<ProbationRow>[] = [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">
            {row.original.first_name} {row.original.last_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.original.designation?.title ?? row.original.employee_code ?? '—'}
          </p>
        </div>
      ),
    },
    {
      id: 'department',
      header: 'Department',
      cell: ({ row }) => row.original.department?.name ?? '—',
    },
    {
      accessorKey: 'date_of_joining',
      header: 'Joined',
      cell: ({ row }) =>
        row.original.date_of_joining ? formatDate(row.original.date_of_joining) : '—',
    },
    {
      accessorKey: 'probation_end_date',
      header: 'Probation Ends',
      cell: ({ row }) => formatDate(row.original.probation_end_date),
    },
    {
      id: 'days_left',
      header: 'Status',
      cell: ({ row }) => {
        const d = row.original.days_left
        if (row.original.is_overdue) {
          return <Badge className="bg-rose-100 text-rose-800">{Math.abs(d)} days overdue</Badge>
        }
        if (d <= 7) return <Badge className="bg-amber-100 text-amber-800">{d} days left</Badge>
        return <Badge variant="outline">{d} days left</Badge>
      },
    },
    {
      id: 'actions',
      cell: ({ row }) =>
        canManage ? (
          <Button variant="outline" size="sm" onClick={() => openConfirm(row.original)}>
            <BadgeCheck className="mr-1.5 h-3.5 w-3.5" /> Confirm
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={window} onValueChange={setWindow}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {WINDOWS.map((w) => (
              <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {overdue > 0 && (
          <p className="text-sm text-rose-600">
            {overdue} confirmation{overdue === 1 ? ' is' : 's are'} overdue.
          </p>
        )}
      </div>

      {!isLoading && rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full bg-emerald-50 p-3">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="font-medium">Nothing to confirm</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Nobody's probation ends in this window. Employees appear here when they have a
              probation end date and have not been confirmed yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DataTable columns={columns} data={rows} isLoading={isLoading} />
      )}

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm employment</DialogTitle>
            <DialogDescription>
              {target
                ? `${target.first_name} ${target.last_name} will be marked as confirmed. Their probation ended on ${formatDate(target.probation_end_date)}.`
                : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2">
            <Label>Confirmation date *</Label>
            <Input
              type="date"
              value={confirmationDate}
              onChange={(e) => setConfirmationDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Usually the day probation ended, not the day you are recording it.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={!confirmationDate || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm employment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
