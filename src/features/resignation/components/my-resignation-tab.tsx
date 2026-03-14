import { useState } from 'react'
import { FileText, Check, Clock, AlertTriangle, XCircle, Loader2, Send } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { useMyResignation, useWithdrawResignation } from '../hooks/use-resignation'
import { useClearances } from '../hooks/use-clearance'
import { ResignationFormDialog } from './resignation-form-dialog'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { EmployeeExitRecord } from '@/types/database.types'

interface MyResignationTabProps {
  employeeId: string
}

const STEPS = [
  { key: 'submitted', label: 'Submitted', icon: Send },
  { key: 'manager_review', label: 'Manager Review', icon: Clock },
  { key: 'hr_review', label: 'HR Review', icon: Clock },
  { key: 'notice_period', label: 'Notice Period', icon: Clock },
  { key: 'clearance', label: 'Clearance', icon: FileText },
  { key: 'complete', label: 'Complete', icon: Check },
]

function getActiveStep(status: EmployeeExitRecord['approval_status'], exitStatus: EmployeeExitRecord['status']): number {
  if (status === 'submitted') return 0
  if (status === 'manager_approved') return 1
  if (status === 'manager_rejected') return 1
  if (status === 'hr_rejected') return 2
  if (status === 'hr_approved') {
    if (exitStatus === 'notice_period') return 3
    if (exitStatus === 'clearance_pending' || exitStatus === 'clearance_completed') return 4
    if (exitStatus === 'completed') return 5
    return 3
  }
  return 0
}

function isStepCompleted(stepIndex: number, activeStep: number, isRejected: boolean): boolean {
  if (isRejected) return stepIndex < activeStep
  return stepIndex < activeStep
}

function Stepper({ resignation }: { resignation: EmployeeExitRecord }) {
  const isRejected = resignation.approval_status === 'manager_rejected' || resignation.approval_status === 'hr_rejected'
  const activeStep = getActiveStep(resignation.approval_status, resignation.status)

  return (
    <div className="flex items-center justify-between">
      {STEPS.map((step, index) => {
        const completed = isStepCompleted(index, activeStep, isRejected)
        const isCurrent = index === activeStep
        const isError = isCurrent && isRejected
        const Icon = step.icon

        return (
          <div key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                  completed && 'border-emerald-500 bg-emerald-500 text-white',
                  isCurrent && !isError && 'border-primary bg-primary text-white',
                  isError && 'border-red-500 bg-red-500 text-white',
                  !completed && !isCurrent && 'border-muted-foreground/30 text-muted-foreground/50',
                )}
              >
                {completed ? (
                  <Check className="h-4 w-4" />
                ) : isError ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  'text-xs text-center max-w-[80px]',
                  (completed || isCurrent) ? 'text-foreground font-medium' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-2 h-0.5 flex-1',
                  completed ? 'bg-emerald-500' : 'bg-muted-foreground/20',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ClearanceStatus({ exitRecordId }: { exitRecordId: string }) {
  const { data: clearances, isLoading } = useClearances(exitRecordId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!clearances || clearances.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No clearance items found.</p>
    )
  }

  const cleared = clearances.filter((c) => c.clearance_status === 'no_objection').length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Clearance Status</CardTitle>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {cleared}/{clearances.length} cleared
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {clearances.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{c.department_name}</p>
                {c.cleared_at && (
                  <p className="text-xs text-muted-foreground">
                    Cleared on {formatDate(c.cleared_at)}
                  </p>
                )}
                {c.notes && (
                  <p className="text-xs text-muted-foreground mt-1">{c.notes}</p>
                )}
              </div>
              <StatusBadge status={c.clearance_status} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function MyResignationTab({ employeeId }: MyResignationTabProps) {
  const { data: resignation, isLoading } = useMyResignation(employeeId)
  const withdrawResignation = useWithdrawResignation()
  const [formOpen, setFormOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // No active resignation — show prompt
  if (!resignation) {
    return (
      <>
        <Card className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">No Active Resignation</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              You do not have any active resignation on record. If you wish to resign, you can submit a resignation request below.
            </p>
            <Button onClick={() => setFormOpen(true)}>Submit Resignation</Button>
          </CardContent>
        </Card>

        <ResignationFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          employeeId={employeeId}
        />
      </>
    )
  }

  // Active resignation exists
  const isRejected = resignation.approval_status === 'manager_rejected' || resignation.approval_status === 'hr_rejected'
  const canWithdraw = resignation.approval_status !== 'hr_approved' && !isRejected && resignation.approval_status !== 'withdrawn'

  const handleWithdraw = async () => {
    try {
      await withdrawResignation.mutateAsync(resignation.id)
      toast.success('Resignation withdrawn successfully')
    } catch {
      toast.error('Failed to withdraw resignation')
    }
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <Card>
        <CardContent className="pt-6">
          <Stepper resignation={resignation} />
        </CardContent>
      </Card>

      {/* Rejection Alert */}
      {isRejected && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Resignation Rejected</p>
              <p className="text-sm text-red-700 mt-1">
                {resignation.approval_status === 'manager_rejected'
                  ? resignation.manager_remarks || 'Your manager has rejected your resignation.'
                  : resignation.hr_remarks || 'HR has rejected your resignation.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resignation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Resignation Date</span>
              <p className="font-medium">{resignation.resignation_date ? formatDate(resignation.resignation_date) : '-'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Last Working Date</span>
              <p className="font-medium">{resignation.last_working_date ? formatDate(resignation.last_working_date) : '-'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Notice Period</span>
              <p className="font-medium">{resignation.notice_period_days ?? '-'} days</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Status</span>
              <div className="mt-0.5">
                <StatusBadge status={resignation.approval_status} />
              </div>
            </div>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Reason</span>
            <p className="text-sm mt-1">{resignation.exit_reason || '-'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Clearance Status (only after HR approval) */}
      {resignation.approval_status === 'hr_approved' && (
        <ClearanceStatus exitRecordId={resignation.id} />
      )}

      {/* Withdraw Button */}
      {canWithdraw && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={handleWithdraw}
            disabled={withdrawResignation.isPending}
          >
            {withdrawResignation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Withdraw Resignation
          </Button>
        </div>
      )}
    </div>
  )
}
