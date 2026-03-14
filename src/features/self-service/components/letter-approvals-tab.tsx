import { useState } from 'react'
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermissions } from '@/hooks/use-permissions'
import { useLetterRequestsForApproval } from '../hooks/use-self-service'
import { LetterActionDialog } from './letter-action-dialog'
import type { LetterRequestWithRelations } from '@/types/database.types'

interface Props {
  approverEmployeeId: string
}

export function LetterApprovalsTab({ approverEmployeeId }: Props) {
  const { isHR, isAdmin } = usePermissions()
  const { data: requests, isLoading } = useLetterRequestsForApproval()
  const [actionRequest, setActionRequest] = useState<LetterRequestWithRelations | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve')

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    )
  }

  // Filter: managers see pending_manager, HR sees pending_hr/manager_approved
  const filtered = requests?.filter((req) => {
    if (isHR || isAdmin) {
      return req.status === 'pending_hr' || req.status === 'manager_approved'
    }
    return req.status === 'pending_manager'
  }) || []

  if (!filtered.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle className="mx-auto h-10 w-10 mb-3 opacity-40" />
        <p>No pending letter approvals.</p>
      </div>
    )
  }

  const level = (isHR || isAdmin) ? 'hr' : 'manager' as const

  return (
    <>
      <div className="space-y-3">
        {filtered.map((req) => {
          const emp = req.employee
          const empName = emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown'

          return (
            <Card key={req.id} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {empName}
                      <span className="text-muted-foreground font-normal"> requested </span>
                      {req.template?.name || 'a letter'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </span>
                      {emp?.department && (
                        <Badge variant="outline" className="text-xs">{emp.department.name}</Badge>
                      )}
                      {req.remarks && (
                        <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">
                          "{req.remarks}"
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={() => {
                      setActionRequest(req)
                      setActionType('reject')
                    }}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setActionRequest(req)
                      setActionType('approve')
                    }}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <LetterActionDialog
        open={!!actionRequest}
        onOpenChange={() => setActionRequest(null)}
        request={actionRequest}
        action={actionType}
        level={level}
        approverEmployeeId={approverEmployeeId}
      />
    </>
  )
}
