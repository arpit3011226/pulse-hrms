import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Check, Loader2, Plane, Plus, X } from 'lucide-react'
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
import { useEmployees } from '@/features/employees/hooks/use-employees'
import { useTravelRequests, useCreateTravelRequest, useUpdateTravelRequest } from '../hooks/use-workplace'
import { travelTotal, type TravelRequest } from '../api/workplace.api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_manager: 'bg-amber-100 text-amber-800',
  pending_finance: 'bg-blue-100 text-blue-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
  cancelled: 'bg-gray-100 text-gray-500',
  completed: 'bg-violet-100 text-violet-800',
}

interface Props {
  employeeId: string
  canApprove: boolean
}

export function TravelTab({ employeeId, canApprove }: Props) {
  const { data: requests, isLoading } = useTravelRequests()
  const { data: employees } = useEmployees()
  const create = useCreateTravelRequest()
  const update = useUpdateTravelRequest()

  const [open, setOpen] = useState(false)
  const [purpose, setPurpose] = useState('')
  const [travelType, setTravelType] = useState<'domestic' | 'international' | 'local'>('domestic')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [depart, setDepart] = useState('')
  const [ret, setRet] = useState('')
  const [travelCost, setTravelCost] = useState('')
  const [stayCost, setStayCost] = useState('')
  const [otherCost, setOtherCost] = useState('')
  const [advance, setAdvance] = useState('')
  const [managerId, setManagerId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setPurpose(''); setTravelType('domestic'); setFrom(''); setTo('')
    setDepart(''); setRet(''); setTravelCost(''); setStayCost('')
    setOtherCost(''); setAdvance(''); setManagerId('')
  }, [open])

  const all = requests ?? []
  const rows = canApprove ? all : all.filter((r) => r.employee_id === employeeId)

  const estimate = travelTotal({
    estimated_travel_cost: Number(travelCost) || 0,
    estimated_stay_cost: Number(stayCost) || 0,
    estimated_other_cost: Number(otherCost) || 0,
  })

  async function submit(asDraft: boolean) {
    setSaving(true)
    try {
      await create.mutateAsync({
        employee_id: employeeId,
        purpose: purpose.trim(),
        travel_type: travelType,
        from_location: from.trim() || null,
        to_location: to.trim(),
        departure_date: depart,
        return_date: ret || null,
        estimated_travel_cost: Number(travelCost) || 0,
        estimated_stay_cost: Number(stayCost) || 0,
        estimated_other_cost: Number(otherCost) || 0,
        advance_requested: Number(advance) || 0,
        manager_id: managerId || null,
        status: asDraft ? 'draft' : 'pending_manager',
      })
      toast.success(asDraft ? 'Saved as draft' : 'Sent for approval')
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the request')
    } finally {
      setSaving(false)
    }
  }

  const columns: ColumnDef<TravelRequest>[] = [
    { accessorKey: 'request_number', header: 'No.' },
    {
      id: 'trip',
      header: 'Trip',
      cell: ({ row }) => (
        <div className="max-w-xs">
          <p className="truncate font-medium">{row.original.to_location}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.purpose}</p>
        </div>
      ),
    },
    ...(canApprove
      ? [{
          id: 'employee',
          header: 'Employee',
          cell: ({ row }: { row: { original: TravelRequest } }) => {
            const e = row.original.employee
            return e ? `${e.first_name} ${e.last_name}` : '—'
          },
        } as ColumnDef<TravelRequest>]
      : []),
    {
      id: 'dates',
      header: 'Dates',
      cell: ({ row }) =>
        `${formatDate(row.original.departure_date)}${row.original.return_date ? ` – ${formatDate(row.original.return_date)}` : ''}`,
    },
    {
      id: 'estimate',
      header: 'Estimate',
      cell: ({ row }) => formatCurrency(travelTotal(row.original)),
    },
    {
      accessorKey: 'advance_requested',
      header: 'Advance',
      cell: ({ row }) =>
        row.original.advance_requested ? formatCurrency(row.original.advance_requested) : '—',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={STATUS_STYLES[row.original.status]}>
          {row.original.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const r = row.original
        if (!canApprove || !['pending_manager', 'pending_finance'].includes(r.status)) return null
        return (
          <div className="flex gap-1">
            <Button
              variant="outline" size="sm"
              onClick={async () => {
                await update.mutateAsync({
                  id: r.id,
                  status: r.status === 'pending_manager' ? 'pending_finance' : 'approved',
                })
                toast.success('Approved')
              }}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="sm" className="text-destructive"
              onClick={async () => {
                await update.mutateAsync({ id: r.id, status: 'rejected' })
                toast.success('Rejected')
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Ask before the trip. Reimbursement covers what you have already spent; this covers what
          you are about to.
        </p>
        <Button onClick={() => setOpen(true)} disabled={!employeeId}>
          <Plus className="mr-2 h-4 w-4" /> New request
        </Button>
      </div>

      {!isLoading && rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full bg-blue-50 p-3">
              <Plane className="h-6 w-6 text-blue-600" />
            </div>
            <p className="font-medium">No travel requests</p>
          </CardContent>
        </Card>
      ) : (
        <DataTable columns={columns} data={rows} isLoading={isLoading} />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="page">
          <DialogHeader>
            <DialogTitle>New travel request</DialogTitle>
            <DialogDescription>
              Estimates are fine — you settle against actuals afterwards.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Purpose *</Label>
              <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={travelType} onValueChange={(v) => setTravelType(v as typeof travelType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="domestic">Domestic</SelectItem>
                    <SelectItem value="international">International</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>From</Label>
                <Input value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>To *</Label>
                <Input value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Departure *</Label>
                <Input type="date" value={depart} onChange={(e) => setDepart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Return</Label>
                <Input type="date" value={ret} onChange={(e) => setRet(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Travel (₹)</Label>
                <Input type="number" value={travelCost} onChange={(e) => setTravelCost(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Stay (₹)</Label>
                <Input type="number" value={stayCost} onChange={(e) => setStayCost(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Other (₹)</Label>
                <Input type="number" value={otherCost} onChange={(e) => setOtherCost(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Estimated total</span>
              <span className="font-medium">{formatCurrency(estimate)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Advance needed (₹)</Label>
                <Input type="number" value={advance} onChange={(e) => setAdvance(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Approving manager</Label>
                <Select value={managerId} onValueChange={setManagerId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {(employees ?? []).filter((e) => e.status === 'active' && e.id !== employeeId).map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => submit(true)} disabled={saving}>Save draft</Button>
            <Button onClick={() => submit(false)} disabled={!purpose.trim() || !to.trim() || !depart || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send for approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
