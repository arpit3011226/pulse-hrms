import { useState } from 'react'
import { ClipboardList, CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermissions } from '@/hooks/use-permissions'
import { useGeneralRequestsForApproval } from '../hooks/use-general-requests'
import { GeneralRequestActionDialog } from './general-request-action-dialog'
import { GENERAL_REQUEST_TYPES } from '@/lib/constants'
import type { GeneralRequestWithRelations } from '@/types/database.types'

interface Props {
  approverEmployeeId: string
}

export function GeneralRequestApprovalsTab({ approverEmployeeId }: Props) {
  const { canApproveGeneralRequestsAsHR } = usePermissions()
  const { data: requests, isLoading } = useGeneralRequestsForApproval()
  const [actionRequest, setActionRequest] = useState<GeneralRequestWithRelations | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve')
  const [actionLevel, setActionLevel] = useState<'manager' | 'hr'>('manager')

  if (isLoading) {
    return <Skeleton className="h-48" />
  }

  const filtered = requests?.filter(req => {
    if (canApproveGeneralRequestsAsHR && (req.status === 'pending_hr' || req.status === 'manager_approved')) {
      return true
    }
    if (req.status === 'pending_manager') return true
    return false
  }) || []

  if (!filtered.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ClipboardList className="mx-auto h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">No pending request approvals.</p>
      </div>
    )
  }

  function openAction(req: GeneralRequestWithRelations, action: 'approve' | 'reject') {
    setActionRequest(req)
    setActionType(action)
    setActionLevel(
      req.status === 'pending_hr' || req.status === 'manager_approved' ? 'hr' : 'manager'
    )
  }

  return (
    <div className="space-y-2">
      {filtered.map((req) => {
        const emp = req.employee
        const empName = emp ? `${emp.first_name} ${emp.last_name}` : 'Employee'
        const typeLabel = GENERAL_REQUEST_TYPES.find(t => t.value === req.request_type)?.label || req.request_type
        const level = req.status === 'pending_hr' || req.status === 'manager_approved' ? 'HR' : 'Manager'

        return (
          <Card key={req.id} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{empName}</p>
                    {emp?.department?.name && (
                      <Badge variant="outline" className="text-xs">{emp.department.name}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] px-1.5">{typeLabel}</Badge>
                    <span className="text-xs text-muted-foreground">{req.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                    {level} Review
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => openAction(req, 'approve')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => openAction(req, 'reject')}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <GeneralRequestActionDialog
        open={!!actionRequest}
        onOpenChange={(open) => { if (!open) setActionRequest(null) }}
        request={actionRequest}
        action={actionType}
        level={actionLevel}
        approverEmployeeId={approverEmployeeId}
      />
    </div>
  )
}
