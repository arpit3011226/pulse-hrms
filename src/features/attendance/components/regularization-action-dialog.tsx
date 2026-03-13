import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/shared/status-badge'
import { useApproveRegularization, useRejectRegularization, useCurrentEmployee } from '../hooks/use-attendance'
import { formatTime } from '../utils/attendance-utils'
import type { RegularizationRequestWithRelations } from '@/types/database.types'
import { toast } from 'sonner'

interface RegularizationActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: RegularizationRequestWithRelations | null
}

export function RegularizationActionDialog({ open, onOpenChange, request }: RegularizationActionDialogProps) {
  const { data: currentEmployee } = useCurrentEmployee()
  const approveRegularization = useApproveRegularization()
  const rejectRegularization = useRejectRegularization()
  const [remarks, setRemarks] = useState('')

  const handleApprove = async () => {
    if (!request || !currentEmployee) return
    try {
      await approveRegularization.mutateAsync({
        id: request.id,
        reviewerId: currentEmployee.id,
        remarks: remarks || undefined,
      })
      toast.success('Regularization approved')
      setRemarks('')
      onOpenChange(false)
    } catch {
      toast.error('Failed to approve')
    }
  }

  const handleReject = async () => {
    if (!request || !currentEmployee) return
    if (!remarks.trim()) {
      toast.error('Remarks are required for rejection')
      return
    }
    try {
      await rejectRegularization.mutateAsync({
        id: request.id,
        reviewerId: currentEmployee.id,
        remarks,
      })
      toast.success('Regularization rejected')
      setRemarks('')
      onOpenChange(false)
    } catch {
      toast.error('Failed to reject')
    }
  }

  const isPending = approveRegularization.isPending || rejectRegularization.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Regularization Request</DialogTitle>
          <DialogDescription>
            Review and approve or reject this attendance correction request.
          </DialogDescription>
        </DialogHeader>
        {request && (
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-3 text-sm space-y-2">
              {request.employee && (
                <p>
                  <span className="text-muted-foreground">Employee:</span>{' '}
                  <span className="font-medium">{request.employee.first_name} {request.employee.last_name}</span>
                </p>
              )}
              <p><span className="text-muted-foreground">Date:</span> {request.date}</p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <p className="text-xs text-muted-foreground">Original Clock In</p>
                  <p className="font-medium">{formatTime(request.original_clock_in)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Requested Clock In</p>
                  <p className="font-medium">{formatTime(request.requested_clock_in)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Original Clock Out</p>
                  <p className="font-medium">{formatTime(request.original_clock_out)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Requested Clock Out</p>
                  <p className="font-medium">{formatTime(request.requested_clock_out)}</p>
                </div>
              </div>
              {request.original_status && request.requested_status && request.original_status !== request.requested_status && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-muted-foreground">Status:</span>
                  <StatusBadge status={request.original_status} />
                  <span>→</span>
                  <StatusBadge status={request.requested_status} />
                </div>
              )}
              <p className="pt-1"><span className="text-muted-foreground">Reason:</span> {request.reason}</p>
            </div>

            <div>
              <Label>Remarks {request.status === 'pending' && '(required for rejection)'}</Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add remarks..."
              />
            </div>

            {request.status === 'pending' && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleReject} disabled={isPending}>
                  Reject
                </Button>
                <Button onClick={handleApprove} disabled={isPending}>
                  Approve
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
