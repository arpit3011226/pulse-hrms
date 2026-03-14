import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  useApproveResignationManager,
  useApproveResignationHR,
  useRejectResignation,
} from '../hooks/use-resignation'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResignationWithEmployee = any

interface ResignationActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: ResignationWithEmployee | null
  level: 'manager' | 'hr'
  approverEmployeeId: string
}

export function ResignationActionDialog({
  open,
  onOpenChange,
  request,
  level,
  approverEmployeeId,
}: ResignationActionDialogProps) {
  const approveManager = useApproveResignationManager()
  const approveHR = useApproveResignationHR()
  const rejectMutation = useRejectResignation()

  const [remarks, setRemarks] = useState('')
  const [overrideDate, setOverrideDate] = useState('')

  if (!request) return null

  const emp = request.employee
  const empName = emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown'
  const dept = emp?.department?.name || '-'

  const isPending = approveManager.isPending || approveHR.isPending || rejectMutation.isPending

  const handleApprove = async () => {
    try {
      if (level === 'manager') {
        await approveManager.mutateAsync({
          exitRecordId: request.id,
          approverEmployeeId,
          remarks: remarks || undefined,
        })
      } else {
        await approveHR.mutateAsync({
          exitRecordId: request.id,
          approverEmployeeId,
          remarks: remarks || undefined,
          overrideLastWorkingDate: overrideDate || undefined,
        })
      }
      toast.success('Resignation approved')
      setRemarks('')
      setOverrideDate('')
      onOpenChange(false)
    } catch {
      toast.error('Failed to approve resignation')
    }
  }

  const handleReject = async () => {
    if (!remarks.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }

    try {
      await rejectMutation.mutateAsync({
        exitRecordId: request.id,
        rejectorEmployeeId: approverEmployeeId,
        remarks,
        level,
      })
      toast.success('Resignation rejected')
      setRemarks('')
      setOverrideDate('')
      onOpenChange(false)
    } catch {
      toast.error('Failed to reject resignation')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Review Resignation</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Employee</span>
            <span className="font-medium">{empName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Department</span>
            <span>{dept}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Resignation Date</span>
            <span>{request.resignation_date ? formatDate(request.resignation_date) : '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last Working Date</span>
            <span>{request.last_working_date ? formatDate(request.last_working_date) : '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <StatusBadge status={request.approval_status} />
          </div>
          {request.exit_reason && (
            <div>
              <span className="text-sm text-muted-foreground">Reason</span>
              <p className="mt-1 text-sm">{request.exit_reason}</p>
            </div>
          )}
        </div>

        {/* HR: optional override for last working date */}
        {level === 'hr' && (
          <div className="space-y-2">
            <Label htmlFor="override_date">Override Last Working Date (optional)</Label>
            <Input
              id="override_date"
              type="date"
              value={overrideDate}
              onChange={(e) => setOverrideDate(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="remarks">Remarks {level === 'manager' ? '(required for rejection)' : '(required for rejection)'}</Label>
          <Textarea
            id="remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add your remarks..."
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={isPending}>
            {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reject
          </Button>
          <Button onClick={handleApprove} disabled={isPending}>
            {(approveManager.isPending || approveHR.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
