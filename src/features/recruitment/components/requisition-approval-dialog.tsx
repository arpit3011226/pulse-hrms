import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Loader2, Send, X } from 'lucide-react'
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
import { useAuth } from '@/features/auth/hooks/use-auth'
import { getCurrentEmployee } from '@/features/attendance/api/attendance.api'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import { useSubmitRequisitionForApproval, useDecideRequisition } from '../hooks/use-recruitment'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

interface Requisition {
  id: string
  title: string
  requisition_code: string
  headcount: number
  min_salary?: number | null
  max_salary?: number | null
  budget_amount?: number | null
  approval_status?: string | null
  approval_notes?: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  requisition: Requisition | null
  /** 'submit' asks for approval; 'decide' approves or rejects */
  mode: 'submit' | 'decide'
}

export function RequisitionApprovalDialog({ open, onOpenChange, requisition, mode }: Props) {
  const { profile } = useAuth()
  const { data: employees } = useEmployees()
  const { data: me } = useQuery({
    queryKey: ['current-employee', profile?.id],
    queryFn: () => getCurrentEmployee(profile!.id),
    enabled: !!profile?.id,
  })
  const submitForApproval = useSubmitRequisitionForApproval()
  const decide = useDecideRequisition()

  const [approverId, setApproverId] = useState('')
  const [budget, setBudget] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !requisition) return
    setApproverId('')
    setNotes('')
    // Suggest the budget from the top of the salary band times headcount
    const suggested =
      requisition.budget_amount ??
      (requisition.max_salary ? requisition.max_salary * (requisition.headcount || 1) : null)
    setBudget(suggested != null ? String(suggested) : '')
  }, [open, requisition])

  async function handleSubmit() {
    if (!requisition || !me?.id) return
    setSaving(true)
    try {
      await submitForApproval.mutateAsync({
        id: requisition.id,
        approverId,
        submittedBy: me.id,
        budgetAmount: budget ? Number(budget) : null,
      })
      toast.success('Sent for approval')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send for approval')
    } finally {
      setSaving(false)
    }
  }

  async function handleDecide(decision: 'approved' | 'rejected') {
    if (!requisition) return
    setSaving(true)
    try {
      await decide.mutateAsync({ id: requisition.id, decision, notes: notes.trim() || null })
      toast.success(decision === 'approved' ? 'Requisition approved and opened' : 'Requisition rejected')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not record the decision')
    } finally {
      setSaving(false)
    }
  }

  const band =
    requisition?.min_salary && requisition?.max_salary
      ? `${formatCurrency(requisition.min_salary)} – ${formatCurrency(requisition.max_salary)}`
      : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'submit' ? 'Send for approval' : 'Approve requisition'}
          </DialogTitle>
          <DialogDescription>
            {requisition
              ? `${requisition.title} · ${requisition.requisition_code} · ${requisition.headcount} position${requisition.headcount === 1 ? '' : 's'}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {band && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <span className="text-muted-foreground">Salary band </span>
              <span className="font-medium">{band}</span>
            </div>
          )}

          {mode === 'submit' ? (
            <>
              <div className="space-y-1.5">
                <Label>Approver *</Label>
                <Select value={approverId} onValueChange={setApproverId}>
                  <SelectTrigger><SelectValue placeholder="Who signs this off?" /></SelectTrigger>
                  <SelectContent>
                    {(employees ?? [])
                      .filter((e) => e.status === 'active' && e.id !== me?.id)
                      .map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.first_name} {e.last_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  You cannot approve your own requisition.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Budget (₹)</Label>
                <Input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="Annual cost for all positions"
                />
                <p className="text-xs text-muted-foreground">
                  Suggested from the top of the band times headcount. Change it if that is not right.
                </p>
              </div>
            </>
          ) : (
            <>
              {requisition?.budget_amount != null && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <span className="text-muted-foreground">Budget requested </span>
                  <span className="font-medium">{formatCurrency(requisition.budget_amount)}</span>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Any conditions or reasons for your decision"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Approving also opens the requisition so applications can come in.
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {mode === 'submit' ? (
            <Button onClick={handleSubmit} disabled={!approverId || saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send for approval
            </Button>
          ) : (
            <>
              <Button
                variant="destructive"
                onClick={() => handleDecide('rejected')}
                disabled={saving}
              >
                <X className="mr-2 h-4 w-4" /> Reject
              </Button>
              <Button onClick={() => handleDecide('approved')} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Approve
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Small badge used in the requisitions table. */
export function ApprovalBadge({ status }: { status?: string | null }) {
  if (!status || status === 'not_submitted') {
    return <Badge variant="outline">Not submitted</Badge>
  }
  if (status === 'pending') return <Badge className="bg-amber-100 text-amber-800">Awaiting approval</Badge>
  if (status === 'approved') return <Badge className="bg-emerald-100 text-emerald-800">Approved</Badge>
  return <Badge className="bg-rose-100 text-rose-800">Rejected</Badge>
}
