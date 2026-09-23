import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, Loader2, Plus, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { getCurrentEmployee } from '@/features/attendance/api/attendance.api'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import { usePermissions } from '@/hooks/use-permissions'
import {
  useMyDelegations, useCreateDelegation, useRevokeDelegation, useApprovalScope,
  useAllDelegations, useDeleteDelegation,
} from '../hooks/use-delegation'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { ApprovalDelegation } from '../api/delegation.api'

function isCurrentlyActive(d: ApprovalDelegation): boolean {
  if (!d.is_active) return false
  const today = new Date().toISOString().split('T')[0]
  return d.start_date <= today && d.end_date >= today
}

export function DelegationSettings() {
  const { profile } = useAuth()
  const { data: employees } = useEmployees()

  const { data: me } = useQuery({
    queryKey: ['current-employee', profile?.id],
    queryFn: () => getCurrentEmployee(profile!.id),
    enabled: !!profile?.id,
  })
  const myId = me?.id as string | undefined

  const { isAdmin, isHR } = usePermissions()
  const canSeeAll = isAdmin || isHR
  const { data: delegations, isLoading } = useMyDelegations(myId)
  const { data: orgDelegations } = useAllDelegations()
  const deleteDelegation = useDeleteDelegation()
  const { delegatedIds, isCovering } = useApprovalScope(myId)
  const createDelegation = useCreateDelegation()
  const revokeDelegation = useRevokeDelegation()

  const [formOpen, setFormOpen] = useState(false)
  const [revokeId, setRevokeId] = useState<string | null>(null)

  const [delegateId, setDelegateId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!formOpen) return
    setDelegateId('')
    setStartDate(new Date().toISOString().split('T')[0])
    setEndDate('')
    setReason('')
  }, [formOpen])

  const all = delegations ?? []
  const iSetUp = all.filter((d) => d.delegator_id === myId)
  const coveringFor = all.filter((d) => d.delegate_id === myId)

  const datesValid = !!startDate && !!endDate && endDate >= startDate
  const canSave = !!delegateId && datesValid && !saving

  async function handleSave() {
    if (!myId) return
    setSaving(true)
    try {
      await createDelegation.mutateAsync({
        delegator_id: myId,
        delegate_id: delegateId,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim() || null,
        is_active: true,
        created_by: myId,
      })
      toast.success('Cover arranged')
      setFormOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not arrange cover')
    } finally {
      setSaving(false)
    }
  }

  function renderRow(d: ApprovalDelegation, mine: boolean) {
    const active = isCurrentlyActive(d)
    const other = mine ? d.delegate : d.delegator
    return (
      <div key={d.id} className="flex items-start justify-between gap-3 border-b py-3 last:border-0">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {mine ? 'Covered by ' : 'Covering for '}
            {other ? `${other.first_name} ${other.last_name}` : '—'}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDate(d.start_date)} – {formatDate(d.end_date)}
            {d.reason ? ` · ${d.reason}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {active ? (
            <Badge className="bg-emerald-100 text-emerald-800">Active now</Badge>
          ) : d.is_active ? (
            <Badge variant="outline">Scheduled</Badge>
          ) : (
            <Badge variant="secondary">Withdrawn</Badge>
          )}
          {mine && d.is_active && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRevokeId(d.id)}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {isCovering && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="flex items-center gap-3 py-4">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm">
              You are currently covering approvals for{' '}
              <span className="font-medium">
                {delegatedIds.length} {delegatedIds.length === 1 ? 'person' : 'people'}
              </span>
              . Their pending approvals appear in your own approval lists.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" /> Cover for my approvals
            </CardTitle>
            <CardDescription>
              When you are away, nominate someone to act on approvals waiting on you. Your reporting
              line does not change.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setFormOpen(true)} disabled={!myId}>
            <Plus className="mr-2 h-4 w-4" /> Arrange cover
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : iSetUp.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No cover arranged. Anything waiting on you will wait until you are back.
            </p>
          ) : (
            <div>{iSetUp.map((d) => renderRow(d, true))}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Approvals I am covering</CardTitle>
          <CardDescription>Cover other people have asked you to provide.</CardDescription>
        </CardHeader>
        <CardContent>
          {coveringFor.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Nobody has asked you to cover their approvals.
            </p>
          ) : (
            <div>{coveringFor.map((d) => renderRow(d, false))}</div>
          )}
        </CardContent>
      </Card>

      {canSeeAll && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All cover across the company</CardTitle>
            <CardDescription>
              Useful when somebody is away unexpectedly and approvals are piling up behind them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {((orgDelegations ?? []) as ApprovalDelegation[]).length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">Nobody has arranged cover.</p>
            ) : (
              <div className="divide-y">
                {((orgDelegations ?? []) as ApprovalDelegation[]).map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">
                          {d.delegator ? `${d.delegator.first_name} ${d.delegator.last_name}` : '—'}
                        </span>
                        {' → '}
                        <span className="font-medium">
                          {d.delegate ? `${d.delegate.first_name} ${d.delegate.last_name}` : '—'}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(d.start_date)} – {formatDate(d.end_date)}
                        {d.reason ? ` · ${d.reason}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isCurrentlyActive(d) ? (
                        <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>
                      ) : d.is_active ? (
                        <Badge variant="outline">Scheduled</Badge>
                      ) : (
                        <Badge variant="secondary">Withdrawn</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={async () => {
                          try {
                            await deleteDelegation.mutateAsync(d.id)
                            toast.success('Removed')
                          } catch {
                            toast.error('Could not remove it')
                          }
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Arrange cover */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Arrange cover</DialogTitle>
            <DialogDescription>
              While you are away, this person can act on approvals that would normally wait for you.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Who is covering? *</Label>
              <Select value={delegateId} onValueChange={setDelegateId}>
                <SelectTrigger><SelectValue placeholder="Select a colleague" /></SelectTrigger>
                <SelectContent>
                  {(employees ?? [])
                    .filter((e) => e.status === 'active' && e.id !== myId)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.first_name} {e.last_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From *</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>To *</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            {startDate && endDate && !datesValid && (
              <p className="text-xs text-destructive">The end date cannot be before the start date.</p>
            )}

            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                placeholder="e.g. Annual leave"
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
              Arrange cover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!revokeId}
        onOpenChange={() => setRevokeId(null)}
        title="Withdraw cover"
        description="This person will stop being able to act on your approvals. Anything they have already approved stays approved."
        confirmLabel="Withdraw"
        variant="destructive"
        onConfirm={async () => {
          try {
            await revokeDelegation.mutateAsync(revokeId!)
            toast.success('Cover withdrawn')
          } catch {
            toast.error('Could not withdraw cover')
          } finally {
            setRevokeId(null)
          }
        }}
      />
    </div>
  )
}
