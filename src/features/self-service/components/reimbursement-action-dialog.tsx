import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ExternalLink } from 'lucide-react'
import { useApproveReimbursementManager, useApproveReimbursementFinance, useRejectReimbursement } from '../hooks/use-reimbursements'
import { REIMBURSEMENT_CATEGORIES } from '@/lib/constants'
import { toast } from 'sonner'
import type { ReimbursementRequestWithRelations } from '@/types/database.types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: ReimbursementRequestWithRelations | null
  action: 'approve' | 'reject'
  level: 'manager' | 'finance'
  approverEmployeeId: string
}

export function ReimbursementActionDialog({ open, onOpenChange, request, action, level, approverEmployeeId }: Props) {
  const [remarks, setRemarks] = useState('')
  const approveManager = useApproveReimbursementManager()
  const approveFinance = useApproveReimbursementFinance()
  const reject = useRejectReimbursement()

  const isPending = approveManager.isPending || approveFinance.isPending || reject.isPending

  async function handleSubmit() {
    if (!request) return

    try {
      if (action === 'approve') {
        if (level === 'manager') {
          await approveManager.mutateAsync({
            requestId: request.id,
            approverEmployeeId,
            remarks: remarks || undefined,
          })
        } else {
          await approveFinance.mutateAsync({
            requestId: request.id,
            approverEmployeeId,
            remarks: remarks || undefined,
          })
        }
        toast.success('Reimbursement approved')
      } else {
        if (!remarks.trim()) {
          toast.error('Please provide a reason for rejection')
          return
        }
        await reject.mutateAsync({
          requestId: request.id,
          rejectorEmployeeId: approverEmployeeId,
          remarks,
          level,
        })
        toast.success('Reimbursement rejected')
      }

      setRemarks('')
      onOpenChange(false)
    } catch {
      toast.error(`Failed to ${action} reimbursement`)
    }
  }

  const emp = request?.employee
  const empName = emp ? `${emp.first_name} ${emp.last_name}` : 'Employee'
  const categoryLabel = REIMBURSEMENT_CATEGORIES.find(c => c.value === request?.category)?.label || request?.category

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {action === 'approve' ? 'Approve' : 'Reject'} Reimbursement
          </DialogTitle>
        </DialogHeader>

        {request && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Employee</span>
              <span className="font-medium">{empName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <span className="font-medium">{categoryLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">₹{Number(request.amount).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expense Date</span>
              <span className="font-medium">
                {new Date(request.expense_date).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </span>
            </div>
            {request.description && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Description</span>
                <span className="font-medium text-right max-w-[200px]">{request.description}</span>
              </div>
            )}
            {request.receipt_url && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Receipt</span>
                <a
                  href={request.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-xs flex items-center gap-1"
                >
                  View Receipt <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>{action === 'reject' ? 'Reason for Rejection *' : 'Remarks (optional)'}</Label>
          <Textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder={action === 'reject' ? 'Please provide a reason...' : 'Optional remarks...'}
            className="min-h-[80px]"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            variant={action === 'reject' ? 'destructive' : 'default'}
          >
            {isPending ? 'Processing...' : action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
