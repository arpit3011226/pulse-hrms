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
import { useEmployees } from '@/features/employees/hooks/use-employees'
import {
  useCurrentEmployee,
  useEmployeeLeavePolicyMap,
  useBulkAssignLeavePolicy,
} from '../hooks/use-leave'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  policy: { id: string; policy_name: string } | null
}

export function AssignLeavePolicyDialog({ open, onOpenChange, policy }: Props) {
  const { data: employees, isLoading: empLoading } = useEmployees()
  const { data: policyMap } = useEmployeeLeavePolicyMap()
  const { data: me } = useCurrentEmployee()
  const bulkAssign = useBulkAssignLeavePolicy()

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setSearch('')
    setSelected(new Set())
    setEffectiveFrom(new Date().toISOString().split('T')[0])
  }, [open])

  // Which policy each employee is on today
  const currentPolicyByEmployee = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of (policyMap ?? []) as Array<{
      employee_id: string
      leave_policy?: { id: string; policy_name: string } | null
    }>) {
      if (row.leave_policy?.policy_name) map.set(row.employee_id, row.leave_policy.policy_name)
    }
    return map
  }, [policyMap])

  const active = (employees ?? []).filter((e) => e.status === 'active')
  const filtered = active.filter((e) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      (e.employee_code ?? '').toLowerCase().includes(q) ||
      (e.email ?? '').toLowerCase().includes(q)
    )
  })

  const allShownSelected = filtered.length > 0 && filtered.every((e) => selected.has(e.id))

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
    if (!policy || selected.size === 0 || !effectiveFrom) return
    setSaving(true)
    try {
      await bulkAssign.mutateAsync({
        employee_ids: Array.from(selected),
        leave_policy_id: policy.id,
        effective_from: effectiveFrom,
        assigned_by: me?.id,
      })
      toast.success(
        `${policy.policy_name} assigned to ${selected.size} employee${selected.size === 1 ? '' : 's'}`
      )
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not assign the policy')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Assign leave policy
          </DialogTitle>
          <DialogDescription>
            Choose the employees who should be on {policy?.policy_name ?? 'this policy'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Effective from *</Label>
            <Input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-48"
            />
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, code or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div className="flex items-center gap-2">
              <Checkbox checked={allShownSelected} onCheckedChange={toggleAllShown} />
              <span className="text-sm">Select all shown ({filtered.length})</span>
            </div>
            <Badge variant="secondary">{selected.size} selected</Badge>
          </div>

          <ScrollArea className="h-64 rounded-md border">
            {empLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading employees…</p>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No employees found.</p>
            ) : (
              <div className="divide-y">
                {filtered.map((e) => {
                  const current = currentPolicyByEmployee.get(e.id)
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
                          {e.email ? ` · ${e.email}` : ''}
                        </p>
                      </div>
                      {current && (
                        <Badge
                          variant={current === policy?.policy_name ? 'secondary' : 'outline'}
                          className="shrink-0 text-xs"
                        >
                          {current === policy?.policy_name ? 'Already on this' : current}
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
          <Button onClick={handleAssign} disabled={selected.size === 0 || !effectiveFrom || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign to {selected.size || 0}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
