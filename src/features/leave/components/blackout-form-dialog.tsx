import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  useLeaveTypes, useCreateBlackoutPeriod, useUpdateBlackoutPeriod,
} from '../hooks/use-leave'
import { toast } from 'sonner'
import type { LeaveBlackoutPeriod } from '@/types/database.types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  period?: LeaveBlackoutPeriod | null
}

export function BlackoutFormDialog({ open, onOpenChange, period }: Props) {
  const { data: leaveTypes } = useLeaveTypes()
  const createPeriod = useCreateBlackoutPeriod()
  const updatePeriod = useUpdateBlackoutPeriod()

  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [allTypes, setAllTypes] = useState(true)
  const [typeIds, setTypeIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(period?.name ?? '')
    setStartDate(period?.start_date ?? '')
    setEndDate(period?.end_date ?? '')
    setReason(period?.reason ?? '')
    setIsActive(period?.is_active ?? true)
    const ids = period?.applicable_leave_type_ids ?? null
    setAllTypes(!ids || ids.length === 0)
    setTypeIds(new Set(ids ?? []))
  }, [open, period])

  const datesValid = !!startDate && !!endDate && endDate >= startDate
  const canSave = !!name.trim() && datesValid && !saving

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim() || null,
        is_active: isActive,
        applicable_leave_type_ids: allTypes ? null : Array.from(typeIds),
      }
      if (period?.id) {
        await updatePeriod.mutateAsync({ id: period.id, ...payload })
        toast.success('Blackout period updated')
      } else {
        await createPeriod.mutateAsync(payload)
        toast.success('Blackout period added')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the blackout period')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle>{period ? 'Edit blackout period' : 'Add blackout period'}</DialogTitle>
          <DialogDescription>
            Leave cannot be applied for during a blackout period — for example a month-end close or a
            peak delivery window.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              placeholder="e.g. Year-end close"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
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

          <div className="space-y-2">
            <Label>Applies to</Label>
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox checked={allTypes} onCheckedChange={(v) => setAllTypes(!!v)} />
              <span className="text-sm">All leave types</span>
            </label>
            {!allTypes && (
              <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                {(leaveTypes ?? []).map((lt) => (
                  <label key={lt.id} className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={typeIds.has(lt.id)}
                      onCheckedChange={() =>
                        setTypeIds((prev) => {
                          const next = new Set(prev)
                          if (next.has(lt.id)) next.delete(lt.id)
                          else next.add(lt.id)
                          return next
                        })
                      }
                    />
                    <span className="text-sm">{lt.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea
              placeholder="Why leave is blocked in this window"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Turn off to keep the record without enforcing it</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {period ? 'Save changes' : 'Add period'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
