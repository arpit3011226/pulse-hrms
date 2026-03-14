import { useState } from 'react'
import { Receipt, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermissions } from '@/hooks/use-permissions'
import { useReimbursementsForApproval } from '../hooks/use-reimbursements'
import { ReimbursementActionDialog } from './reimbursement-action-dialog'
import { REIMBURSEMENT_CATEGORIES } from '@/lib/constants'
import type { ReimbursementRequestWithRelations } from '@/types/database.types'

interface Props {
  approverEmployeeId: string
}

export function ReimbursementApprovalsTab({ approverEmployeeId }: Props) {
  const { canApproveReimbursementsAsFinance } = usePermissions()
  const { data: requests, isLoading } = useReimbursementsForApproval()
  const [actionRequest, setActionRequest] = useState<ReimbursementRequestWithRelations | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve')
  const [actionLevel, setActionLevel] = useState<'manager' | 'finance'>('manager')

  if (isLoading) {
    return <Skeleton className="h-48" />
  }

  // Filter based on role: managers see pending_manager, finance sees pending_finance
  const filtered = requests?.filter(req => {
    if (canApproveReimbursementsAsFinance && (req.status === 'pending_finance' || req.status === 'manager_approved')) {
      return true
    }
    if (req.status === 'pending_manager') return true
    return false
  }) || []

  if (!filtered.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Receipt className="mx-auto h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">No pending reimbursement approvals.</p>
      </div>
    )
  }

  function openAction(req: ReimbursementRequestWithRelations, action: 'approve' | 'reject') {
    setActionRequest(req)
    setActionType(action)
    setActionLevel(
      req.status === 'pending_finance' || req.status === 'manager_approved'
        ? 'finance'
        : 'manager'
    )
  }

  return (
    <div className="space-y-2">
      {filtered.map((req) => {
        const emp = req.employee
        const empName = emp ? `${emp.first_name} ${emp.last_name}` : 'Employee'
        const categoryLabel = REIMBURSEMENT_CATEGORIES.find(c => c.value === req.category)?.label || req.category
        const level = req.status === 'pending_finance' || req.status === 'manager_approved' ? 'Finance' : 'Manager'

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
                    <span className="text-xs text-muted-foreground">{categoryLabel}</span>
                    <span className="text-xs font-semibold text-primary">₹{Number(req.amount).toLocaleString('en-IN')}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(req.expense_date).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </span>
                    {req.receipt_url && (
                      <a
                        href={req.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {req.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate max-w-md">{req.description}</p>
                  )}
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

      <ReimbursementActionDialog
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
