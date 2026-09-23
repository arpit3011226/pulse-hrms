import { useEffect, useState } from 'react'
import { Loader2, Rocket } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import { useOnboardingTemplates, useOnboardingRuns, useStartOnboarding } from '../hooks/use-onboarding'
import { JOURNEY_MILESTONES } from '../types'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-select an employee, e.g. straight after converting a candidate */
  employeeId?: string
  currentEmployeeId?: string
}

export function StartOnboardingDialog({ open, onOpenChange, employeeId, currentEmployeeId }: Props) {
  const { data: employees } = useEmployees()
  const { data: templates } = useOnboardingTemplates()
  const { data: runs } = useOnboardingRuns()
  const startOnboarding = useStartOnboarding()

  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [joiningDate, setJoiningDate] = useState('')
  const [buddyId, setBuddyId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // People who already have an onboarding — one per person
  const alreadyOnboarding = new Set((runs ?? []).map((r) => r.employee_id))

  const candidates = (employees ?? []).filter(
    (e) => e.status === 'active' && !alreadyOnboarding.has(e.id)
  )
  const employee = (employees ?? []).find((e) => e.id === selectedEmployee)

  useEffect(() => {
    if (!open) return
    setSelectedEmployee(employeeId ?? '')
    setTemplateId('')
    setBuddyId('')
    setNotes('')
    setJoiningDate('')
  }, [open, employeeId])

  // Default the joining date to what is on the employee record
  useEffect(() => {
    if (employee?.date_of_joining) setJoiningDate(employee.date_of_joining)
  }, [employee])

  // Pick the template that best fits their department, else the default one
  useEffect(() => {
    if (!templates || templateId || !employee) return
    const byDept = templates.find(
      (t) => t.is_active && t.department_id && t.department_id === employee.department_id
    )
    const fallback = templates.find((t) => t.is_active && t.is_default)
    const chosen = byDept ?? fallback
    if (chosen) setTemplateId(chosen.id)
  }, [templates, employee, templateId])

  const template = (templates ?? []).find((t) => t.id === templateId)
  const taskCount = template?.onboarding_template_tasks?.length ?? 0
  const canStart = !!selectedEmployee && !!joiningDate && !saving

  async function handleStart() {
    if (!employee) return
    setSaving(true)
    try {
      await startOnboarding.mutateAsync({
        employeeId: selectedEmployee,
        joiningDate,
        templateId: templateId || null,
        buddyId: buddyId || null,
        managerId: employee.reporting_manager_id ?? null,
        createdBy: currentEmployeeId ?? null,
      })
      toast.success(`Onboarding started for ${employee.first_name}`)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start onboarding')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" /> Start onboarding
          </DialogTitle>
          <DialogDescription>
            Creates the task list from a template and sets up the 30/60/90/180/365 day check-ins.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>New joiner *</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {candidates.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    Everyone active already has an onboarding.
                  </div>
                ) : (
                  candidates.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name}
                      {e.employee_code ? ` · ${e.employee_code}` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Joining date *</Label>
              <Input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Buddy</Label>
              <Select value={buddyId} onValueChange={setBuddyId}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {(employees ?? [])
                    .filter((e) => e.status === 'active' && e.id !== selectedEmployee)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.first_name} {e.last_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="No template — start with an empty list" /></SelectTrigger>
              <SelectContent>
                {(templates ?? [])
                  .filter((t) => t.is_active)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                      {t.is_default ? ' (default)' : ''}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {template && (
              <p className="text-xs text-muted-foreground">
                {taskCount} task{taskCount === 1 ? '' : 's'} will be created, dated from the joining
                date.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              placeholder="Anything specific about this joiner"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {joiningDate && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Check-ins will be set for</p>
              <div className="flex flex-wrap gap-1.5">
                {JOURNEY_MILESTONES.map((d) => {
                  const date = new Date(joiningDate)
                  date.setDate(date.getDate() + d)
                  return (
                    <Badge key={d} variant="outline" className="text-xs">
                      {d} days · {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleStart} disabled={!canStart}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start onboarding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
