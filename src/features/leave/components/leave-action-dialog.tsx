import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/shared/status-badge'
import { useApproveLeave, useRejectLeave } from '../hooks/use-leave'
import { formatDate } from '@/lib/utils'
import type { LeaveRequestWithRelations, LeaveBalanceWithRelations } from '@/types/database.types'
import { toast } from 'sonner'

interface LeaveActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: LeaveRequestWithRelations
  balance: LeaveBalanceWithRelations | null
  approverId: string
}

export function LeaveActionDialog({
  open,
  onOpenChange,
  request,
  balance,
  approverId,
}: LeaveActionDialogProps) {
  const approveLeave = useApproveLeave()
  const rejectLeave = useRejectLeave()
  const [rejectionReason, setRejectionReason] = useState('')

  const handleApprove = async () => {
    if (!balance) {
      toast.error('No balance record found for this leave type')
      return
    }
    try {
      await approveLeave.mutateAsync({
        requestId: request.id,
        approvedBy: approverId,
        totalDays: request.total_days,
        balanceId: balance.id,
        currentUsedDays: balance.used_days,
        currentPendingDays: balance.pending_days,
      })
      toast.success('Leave approved')
      onOpenChange(false)
    } catch {
      toast.error('Failed to approve leave')
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }
    if (!balance) {
      toast.error('No balance record found')
      return
    }
    try {
      await rejectLeave.mutateAsync({
        requestId: request.id,
        rejectionReason,
        totalDays: request.total_days,
        balanceId: balance.id,
        currentPendingDays: balance.pending_days,
      })
      toast.success('Leave rejected')
      onOpenChange(false)
    } catch {
      toast.error('Failed to reject leave')
    }
  }

  const emp = request.employee
  const isPending = approveLeave.isPending || rejectLeave.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Leave Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Employee</span>
            <span className="font-medium">{emp ? `${emp.first_name} ${emp.last_name}` : '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Leave Type</span>
            <span>{request.leave_type?.name || '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Duration</span>
            <span>
              {formatDate(request.start_date)} - {formatDate(request.end_date)}
              {request.is_half_day && ` (${request.half_day_period?.replace('_', ' ')})`}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Days</span>
            <span className="font-medium">{request.total_days}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <StatusBadge status={request.status} />
          </div>
          {request.reason && (
            <div>
              <span className="text-sm text-muted-foreground">Reason</span>
              <p className="mt-1 text-sm">{request.reason}</p>
            </div>
          )}
          {balance && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Available Balance</span>
              <span>{Math.max(0, balance.total_days + balance.carried_forward_days - balance.used_days - balance.pending_days)} days</span>
            </div>
          )}
        </div>

        {request.status === 'pending' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="rejection_reason">Rejection Reason (required for reject)</Label>
              <Input
                id="rejection_reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection..."
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={isPending}>
                {rejectLeave.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reject
              </Button>
              <Button onClick={handleApprove} disabled={isPending}>
                {approveLeave.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Approve
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
