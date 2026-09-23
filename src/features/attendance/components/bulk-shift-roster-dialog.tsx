import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search, Users } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import { useDepartments } from '@/features/departments/hooks/use-departments'
import {
  useShifts, useShiftRosters, useBulkAssignShiftRoster, useCurrentEmployee,
} from '../hooks/use-attendance'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BulkShiftRosterDialog({ open, onOpenChange }: Props) {
  const { data: employees, isLoading: empLoading } = useEmployees()
  const { data: departments } = useDepartments()
  const { data: shifts } = useShifts()
  const { data: rosters } = useShiftRosters()
  const { data: me } = useCurrentEmployee()
  const bulkAssign = useBulkAssignShiftRoster()

  const [shiftId, setShiftId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setShiftId('')
    setStartDate(new Date().toISOString().split('T')[0])
    setEndDate('')
    setSearch('')
    setDeptFilter('all')
    setSelected(new Set())
  }, [open])

  // Which shift each employee is on today, so you can see what you are changing
  const currentShiftByEmployee = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of (rosters ?? []) as Array<{
      employee_id: string
      end_date: string | null
      shift?: { name: string } | null
    }>) {
      if (!r.end_date || r.end_date >= new Date().toISOString().split('T')[0]) {
        if (r.shift?.name) map.set(r.employee_id, r.shift.name)
      }
    }
    return map
  }, [rosters])

  const active = (employees ?? []).filter((e) => e.status === 'active')
  const filtered = active.filter((e) => {
    if (deptFilter !== 'all' && e.department_id !== deptFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      (e.employee_code ?? '').toLowerCase().includes(q)
    )
  })

  const allShownSelected = filtered.length > 0 && filtered.every((e) => selected.has(e.id))
  const datesValid = !!startDate && (!endDate || endDate >= startDate)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllShown() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allShownSelected) filtered.forEach((e) => next.delete(e.id))
      else filtered.forEach((e) => next.add(e.id))
      return next
    })
  }

  async function handleAssign() {
    if (!shiftId || selected.size === 0 || !datesValid) return
    setSaving(true)
    try {
      await bulkAssign.mutateAsync({
        employee_ids: Array.from(selected),
        shift_id: shiftId,
        start_date: startDate,
        end_date: endDate || undefined,
        assigned_by: me?.id,
      })
      toast.success(`Shift assigned to ${selected.size} employee${selected.size === 1 ? '' : 's'}`)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not assign the shift')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Assign shift to many
          </DialogTitle>
          <DialogDescription>
            Put a group of employees on the same shift in one go.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Shift *</Label>
              <Select value={shiftId} onValueChange={setShiftId}>
                <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                <SelectContent>
                  {(shifts ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>From *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          {!datesValid && (
            <p className="text-xs text-destructive">The end date cannot be before the start date.</p>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or code"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {(departments ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div className="flex items-center gap-2">
              <Checkbox checked={allShownSelected} onCheckedChange={toggleAllShown} />
              <span className="text-sm">Select all shown ({filtered.length})</span>
            </div>
            <Badge variant="secondary">{selected.size} selected</Badge>
          </div>

          <ScrollArea className="h-56 rounded-md border">
            {empLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading employees…</p>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No employees found.</p>
            ) : (
              <div className="divide-y">
                {filtered.map((e) => {
                  const current = currentShiftByEmployee.get(e.id)
                  return (
                    <label
                      key={e.id}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/50"
                    >
                      <Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggle(e.id)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {e.first_name} {e.last_name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {e.employee_code ?? '—'}
                        </p>
                      </div>
                      {current && (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          now on {current}
                        </Badge>
                      )}
                    </label>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleAssign}
            disabled={!shiftId || selected.size === 0 || !datesValid || saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign to {selected.size || 0}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
