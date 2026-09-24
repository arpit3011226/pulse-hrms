import { useState } from 'react'
import { LogOut, Clock, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { usePermissions } from '@/hooks/use-permissions'
import { formatDate } from '@/lib/utils'
import { useExitRecord, useStatusHistory } from '../hooks/use-employee-lifecycle'
import { EmployeeExitDialog } from './employee-exit-dialog'
import type { Employee } from '@/types/database.types'
import { EXIT_TYPES } from '@/lib/constants'

interface EmployeeExitTabProps {
  employee: Employee
}

export function EmployeeExitTab({ employee }: EmployeeExitTabProps) {
  const permissions = usePermissions()
  const canInitiate = permissions.canInitiateExit
  const { data: exitRecord, isLoading: loadingExit } = useExitRecord(employee.id)
  const { data: statusHistory, isLoading: loadingHistory } = useStatusHistory(employee.id)
  const [exitDialogOpen, setExitDialogOpen] = useState(false)

  const getExitTypeLabel = (val: string) =>
    EXIT_TYPES.find(t => t.value === val)?.label || val

  return (
    <div className="space-y-6">
      {/* Exit Record */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Exit Details</CardTitle>
          {canInitiate && !exitRecord && employee.status === 'active' && (
            <Button size="sm" variant="destructive" onClick={() => setExitDialogOpen(true)}>
              <LogOut className="mr-1 h-4 w-4" /> Initiate Exit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingExit ? (
            <Skeleton className="h-32 w-full" />
          ) : !exitRecord ? (
            <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
              <CheckCircle className="mb-2 h-8 w-8 text-green-500" />
              <p className="text-sm">No exit record. Employee is active.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Exit Type</p>
                  <p className="text-sm font-medium">{getExitTypeLabel(exitRecord.exit_type)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <StatusBadge status={exitRecord.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Clearance Status</p>
                  <StatusBadge status={exitRecord.clearance_status} />
                </div>
                {exitRecord.resignation_date && (
                  <div>
                    <p className="text-xs text-muted-foreground">Resignation Date</p>
                    <p className="text-sm font-medium">{formatDate(exitRecord.resignation_date)}</p>
                  </div>
                )}
                {exitRecord.last_working_date && (
                  <div>
                    <p className="text-xs text-muted-foreground">Last Working Date</p>
                    <p className="text-sm font-medium">{formatDate(exitRecord.last_working_date)}</p>
                  </div>
                )}
                {exitRecord.notice_period_days && (
                  <div>
                    <p className="text-xs text-muted-foreground">Notice Period</p>
                    <p className="text-sm font-medium">{exitRecord.notice_period_days} days ({exitRecord.notice_period_served || 0} served)</p>
                  </div>
                )}
                {exitRecord.regretted_attrition && (
                  <div>
                    <p className="text-xs text-muted-foreground">Regretted Attrition</p>
                    <p className="text-sm font-medium text-amber-600">Yes</p>
                  </div>
                )}
                {exitRecord.exit_interview_done && (
                  <div>
                    <p className="text-xs text-muted-foreground">Exit Interview</p>
                    <p className="text-sm font-medium text-green-600">Completed</p>
                  </div>
                )}
              </div>

              {exitRecord.exit_reason && (
                <div>
                  <p className="text-xs text-muted-foreground">Exit Reason</p>
                  <p className="text-sm">{exitRecord.exit_reason}</p>
                </div>
              )}

              {exitRecord.exit_interview_notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Exit Interview Notes</p>
                  <p className="text-sm">{exitRecord.exit_interview_notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status History Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status History</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
          ) : !statusHistory?.length ? (
            <p className="text-sm text-muted-foreground">No status changes recorded.</p>
          ) : (
            <div className="relative space-y-0">
              <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
              {statusHistory.map((entry) => (
                <div key={entry.id} className="relative flex gap-4 pb-4">
                  <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2">
                      {entry.previous_status && (
                        <>
                          <StatusBadge status={entry.previous_status} />
                          <span className="text-xs text-muted-foreground">→</span>
                        </>
                      )}
                      <StatusBadge status={entry.new_status} />
                      <span className="text-xs text-muted-foreground">{formatDate(entry.changed_on)}</span>
                    </div>
                    {entry.reason && <p className="mt-1 text-xs text-muted-foreground">{entry.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exit Dialog */}
      <EmployeeExitDialog
        open={exitDialogOpen}
        onOpenChange={setExitDialogOpen}
        employee={employee}
      />
    </div>
  )
}
