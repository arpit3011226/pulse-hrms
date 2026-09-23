import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Loader2, Plus, ShieldAlert } from 'lucide-react'
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
import { useCandidates, useBackgroundChecks, useCreateBackgroundCheck, useUpdateBackgroundCheck } from '../hooks/use-recruitment'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

const CHECK_TYPES = [
  { value: 'identity', label: 'Identity' },
  { value: 'address', label: 'Address' },
  { value: 'education', label: 'Education' },
  { value: 'employment', label: 'Previous employment' },
  { value: 'criminal', label: 'Criminal record' },
  { value: 'credit', label: 'Credit' },
  { value: 'reference', label: 'Reference' },
  { value: 'drug', label: 'Drug test' },
  { value: 'other', label: 'Other' },
]

const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'clear', label: 'Clear' },
  { value: 'discrepancy', label: 'Discrepancy' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-800',
  clear: 'bg-emerald-100 text-emerald-800',
  discrepancy: 'bg-amber-100 text-amber-800',
  failed: 'bg-rose-100 text-rose-800',
  cancelled: 'bg-gray-100 text-gray-500',
}

type CheckRow = {
  id: string
  check_type: string
  vendor: string | null
  reference_number: string | null
  initiated_on: string | null
  completed_on: string | null
  status: string
  findings: string | null
  candidate?: { id: string; first_name: string; last_name: string; email: string } | null
  employee?: { id: string; first_name: string; last_name: string; employee_code: string | null } | null
}

export function BackgroundChecksTab({ canManage }: { canManage: boolean }) {
  const { data: checks, isLoading } = useBackgroundChecks()
  const { data: candidates } = useCandidates()
  const createCheck = useCreateBackgroundCheck()
  const updateCheck = useUpdateBackgroundCheck()

  const [formOpen, setFormOpen] = useState(false)
  const [editRow, setEditRow] = useState<CheckRow | null>(null)

  const [candidateId, setCandidateId] = useState('')
  const [checkType, setCheckType] = useState('employment')
  const [vendor, setVendor] = useState('')
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)

  const [editStatus, setEditStatus] = useState('pending')
  const [editFindings, setEditFindings] = useState('')
  const [editCompleted, setEditCompleted] = useState('')

  useEffect(() => {
    if (!formOpen) return
    setCandidateId(''); setCheckType('employment'); setVendor(''); setReference('')
  }, [formOpen])

  useEffect(() => {
    if (!editRow) return
    setEditStatus(editRow.status)
    setEditFindings(editRow.findings ?? '')
    setEditCompleted(editRow.completed_on ?? '')
  }, [editRow])

  const rows = (checks ?? []) as unknown as CheckRow[]
  const flagged = rows.filter((r) => r.status === 'discrepancy' || r.status === 'failed').length

  async function handleCreate() {
    setSaving(true)
    try {
      await createCheck.mutateAsync({
        candidate_id: candidateId,
        check_type: checkType,
        vendor: vendor.trim() || null,
        reference_number: reference.trim() || null,
        status: 'pending',
      })
      toast.success('Check recorded')
      setFormOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not record the check')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!editRow) return
    setSaving(true)
    try {
      await updateCheck.mutateAsync({
        id: editRow.id,
        status: editStatus,
        findings: editFindings.trim() || null,
        completed_on: editCompleted || null,
      })
      toast.success('Check updated')
      setEditRow(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the check')
    } finally {
      setSaving(false)
    }
  }

  const columns: ColumnDef<CheckRow>[] = [
    {
      id: 'subject',
      header: 'Person',
      cell: ({ row }) => {
        const c = row.original.candidate
        const e = row.original.employee
        const who = c ? `${c.first_name} ${c.last_name}` : e ? `${e.first_name} ${e.last_name}` : '—'
        return (
          <div>
            <p className="font-medium">{who}</p>
            <p className="text-xs text-muted-foreground">{c ? 'Candidate' : e ? 'Employee' : ''}</p>
          </div>
        )
      },
    },
    {
      accessorKey: 'check_type',
      header: 'Check',
      cell: ({ row }) =>
        CHECK_TYPES.find((t) => t.value === row.original.check_type)?.label ?? row.original.check_type,
    },
    {
      accessorKey: 'vendor',
      header: 'Vendor',
      cell: ({ row }) => row.original.vendor ?? '—',
    },
    {
      accessorKey: 'initiated_on',
      header: 'Started',
      cell: ({ row }) => (row.original.initiated_on ? formatDate(row.original.initiated_on) : '—'),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={STATUS_STYLES[row.original.status] ?? ''}>
          {STATUSES.find((s) => s.value === row.original.status)?.label ?? row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) =>
        canManage ? (
          <Button variant="outline" size="sm" onClick={() => setEditRow(row.original)}>
            Update
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {flagged > 0
            ? `${flagged} check${flagged === 1 ? '' : 's'} need attention.`
            : 'Track verification of what a candidate has told you.'}
        </p>
        {canManage && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New check
          </Button>
        )}
      </div>

      {!isLoading && rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full bg-violet-50 p-3">
              <ShieldAlert className="h-6 w-6 text-violet-600" />
            </div>
            <p className="font-medium">No background checks recorded</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Record each check you run and its outcome, so an offer is never made on unverified
              claims.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DataTable columns={columns} data={rows} isLoading={isLoading} />
      )}

      {/* New check */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New background check</DialogTitle>
            <DialogDescription>Record a check you are running on a candidate.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Candidate *</Label>
              <Select value={candidateId} onValueChange={setCandidateId}>
                <SelectTrigger><SelectValue placeholder="Select candidate" /></SelectTrigger>
                <SelectContent>
                  {(candidates ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Check type *</Label>
              <Select value={checkType} onValueChange={setCheckType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHECK_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Vendor</Label>
                <Input value={vendor} onChange={(e) => setVendor(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Reference no.</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!candidateId || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record check
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update check */}
      <Dialog open={!!editRow} onOpenChange={(open) => !open && setEditRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update check</DialogTitle>
            <DialogDescription>Record the outcome once the vendor comes back.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Status *</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Completed on</Label>
              <Input type="date" value={editCompleted} onChange={(e) => setEditCompleted(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Findings</Label>
              <Textarea
                placeholder="What the check turned up"
                value={editFindings}
                onChange={(e) => setEditFindings(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
