import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useApproveGeneralRequestManager, useApproveGeneralRequestHR, useRejectGeneralRequest } from '../hooks/use-general-requests'
import { GENERAL_REQUEST_TYPES } from '@/lib/constants'
import { toast } from 'sonner'
import type { GeneralRequestWithRelations } from '@/types/database.types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: GeneralRequestWithRelations | null
  action: 'approve' | 'reject'
  level: 'manager' | 'hr'
  approverEmployeeId: string
}

const FIELD_LABELS: Record<string, string> = {
  reason: 'Reason',
  asset_type: 'Asset Type',
  justification: 'Justification',
  start_date: 'Start Date',
  end_date: 'End Date',
  current_shift: 'Current Shift',
  requested_shift: 'Requested Shift',
  effective_date: 'Effective Date',
  date: 'Date',
  hours: 'Hours',
}

export function GeneralRequestActionDialog({ open, onOpenChange, request, action, level, approverEmployeeId }: Props) {
  const [remarks, setRemarks] = useState('')
  const approveManager = useApproveGeneralRequestManager()
  const approveHR = useApproveGeneralRequestHR()
  const reject = useRejectGeneralRequest()

  const isPending = approveManager.isPending || approveHR.isPending || reject.isPending

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
          await approveHR.mutateAsync({
            requestId: request.id,
            approverEmployeeId,
            remarks: remarks || undefined,
          })
        }
        toast.success('Request approved')
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
        toast.success('Request rejected')
      }

      setRemarks('')
      onOpenChange(false)
    } catch {
      toast.error(`Failed to ${action} request`)
    }
  }

  const emp = request?.employee
  const empName = emp ? `${emp.first_name} ${emp.last_name}` : 'Employee'
  const typeLabel = GENERAL_REQUEST_TYPES.find(t => t.value === request?.request_type)?.label || request?.request_type

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {action === 'approve' ? 'Approve' : 'Reject'} Request
          </DialogTitle>
        </DialogHeader>

        {request && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Employee</span>
              <span className="font-medium">{empName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">{typeLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Title</span>
              <span className="font-medium text-right max-w-[200px]">{request.title}</span>
            </div>
            {/* Custom fields */}
            {request.custom_fields && Object.entries(request.custom_fields).map(([key, value]) => {
              if (!value) return null
              const label = FIELD_LABELS[key] || key
              return (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-right max-w-[200px]">{String(value)}</span>
                </div>
              )
            })}
            {request.description && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Notes</span>
                <span className="font-medium text-right max-w-[200px]">{request.description}</span>
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
