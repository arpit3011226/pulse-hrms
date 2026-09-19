import { useMyLeaveRequests, useMyLeaveBalances, useLeaveTypes, useApproveLeave, useRejectLeave } from '@/features/leave/hooks/use-leave'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { LeaveRequest, LeaveBalance } from '@/types/database.types'

interface HubTimeOffPanelProps {
  employeeId: string
  canApprove: boolean
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const month = s.toLocaleDateString('en-IN', { month: 'short' })
  const sd = s.getDate()
  const ed = e.getDate()
  return sd === ed ? `${month} ${sd}` : `${month} ${sd}-${ed}`
}

export function HubTimeOffPanel({ employeeId, canApprove }: HubTimeOffPanelProps) {
  const year = new Date().getFullYear()
  const { profile } = useAuth()
  const { data: requests, isLoading } = useMyLeaveRequests(employeeId)
  const { data: balances } = useMyLeaveBalances(employeeId, year)
  const { data: leaveTypes } = useLeaveTypes()
  const approveMutation = useApproveLeave()
  const rejectMutation = useRejectLeave()

  const getTypeName = (typeId: string) => {
    return leaveTypes?.find((t) => t.id === typeId)?.name || 'Leave'
  }

  const findBalance = (leaveTypeId: string): LeaveBalance | undefined => {
    return (balances ?? []).find((b) => b.leave_type_id === leaveTypeId)
  }

  const handleApprove = async (request: LeaveRequest) => {
    const balance = findBalance(request.leave_type_id)
    if (!balance) {
      toast.error('Leave balance not found')
      return
    }
    try {
      await approveMutation.mutateAsync({
        requestId: request.id,
        approvedBy: profile?.id ?? '',
        totalDays: request.total_days,
        balanceId: balance.id,
        currentUsedDays: balance.used_days,
        currentPendingDays: balance.pending_days,
      })
      toast.success('Leave approved')
    } catch {
      toast.error('Failed to approve leave')
    }
  }

  const handleReject = async (request: LeaveRequest) => {
    const balance = findBalance(request.leave_type_id)
    if (!balance) {
      toast.error('Leave balance not found')
      return
    }
    try {
      await rejectMutation.mutateAsync({
        requestId: request.id,
        rejectionReason: 'Rejected from hub',
        totalDays: request.total_days,
        balanceId: balance.id,
        currentPendingDays: balance.pending_days,
      })
      toast.success('Leave rejected')
    } catch {
      toast.error('Failed to reject leave')
    }
  }

  if (isLoading) {
    return <div className="animate-pulse rounded-lg border bg-muted/30 p-6 h-20" />
  }

  const recentRequests = (requests ?? [])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const balanceSummary = (balances ?? []).slice(0, 3)

  return (
    <div className="space-y-3">
      {balanceSummary.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {balanceSummary.map((b) => (
            <div key={b.id} className="rounded-lg border bg-white px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">{getTypeName(b.leave_type_id)}</p>
              <p className="text-lg font-bold text-foreground">
                {b.total_days - b.used_days - b.pending_days}
              </p>
              <p className="text-[10px] text-muted-foreground">of {b.total_days} remaining</p>
            </div>
          ))}
        </div>
      )}

      {recentRequests.length === 0 ? (
        <div className="rounded-lg border bg-white p-4 text-center text-sm text-muted-foreground">
          No leave requests
        </div>
      ) : (
        <div className="space-y-2">
          {recentRequests.map((req) => (
            <LeaveRequestCard
              key={req.id}
              request={req}
              typeName={getTypeName(req.leave_type_id)}
              canApprove={canApprove}
              onApprove={() => handleApprove(req)}
              onReject={() => handleReject(req)}
              isApproving={approveMutation.isPending}
              isRejecting={rejectMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LeaveRequestCard({
  request,
  typeName,
  canApprove,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  request: LeaveRequest
  typeName: string
  canApprove: boolean
  onApprove: () => void
  onReject: () => void
  isApproving: boolean
  isRejecting: boolean
}) {
  const isPending = request.status === 'pending'
  const isApproved = request.status === 'approved'
  const isRejected = request.status === 'rejected'

  const statusColors: Record<string, string> = {
    pending: 'text-amber-600',
    approved: 'text-emerald-600',
    rejected: 'text-red-500',
    cancelled: 'text-muted-foreground',
  }

  const bgColors: Record<string, string> = {
    pending: 'bg-white border',
    approved: 'bg-emerald-50/50 border border-emerald-200',
    rejected: 'bg-red-50/50 border border-red-200',
    cancelled: 'bg-muted/30 border',
  }

  return (
    <div className={`rounded-lg p-4 ${bgColors[request.status] || bgColors.pending}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            Leave: {formatDateRange(request.start_date, request.end_date)} ({typeName})
          </p>
          {isApproved && (
            <p className="mt-1 text-xs text-emerald-600">
              Calendar updated · Manager notified
            </p>
          )}
          {isRejected && request.rejection_reason && (
            <p className="mt-1 text-xs text-red-500">
              Reason: {request.rejection_reason}
            </p>
          )}
        </div>
        <span className={`text-xs font-semibold capitalize ${statusColors[request.status] || ''}`}>
          {request.status}
        </span>
      </div>

      {isPending && canApprove && (
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            className="h-7 bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-4"
            onClick={onApprove}
            disabled={isApproving}
          >
            {isApproving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-4"
            onClick={onReject}
            disabled={isRejecting}
          >
            Reject
          </Button>
        </div>
      )}
    </div>
  )
}
