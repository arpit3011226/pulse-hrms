import { User, CalendarDays, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResignationWithEmployee = any

const EXIT_TYPE_COLORS: Record<string, string> = {
  resignation: 'bg-amber-50 text-amber-700 border-amber-200',
  termination: 'bg-red-50 text-red-700 border-red-200',
  mutual_separation: 'bg-purple-50 text-purple-700 border-purple-200',
  retirement: 'bg-blue-50 text-blue-700 border-blue-200',
  absconding: 'bg-rose-50 text-rose-700 border-rose-200',
  contract_end: 'bg-gray-50 text-gray-700 border-gray-200',
}

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-amber-100 text-amber-700 border-amber-200',
  manager_approved: 'bg-blue-100 text-blue-700 border-blue-200',
  hr_approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  manager_rejected: 'bg-red-100 text-red-700 border-red-200',
  hr_rejected: 'bg-red-100 text-red-700 border-red-200',
  withdrawn: 'bg-gray-100 text-gray-700 border-gray-200',
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ')
}

interface ResignationApprovalListProps {
  requests: ResignationWithEmployee[]
  onAction: (request: ResignationWithEmployee) => void
  level: 'manager' | 'hr' | 'admin'
}

export function ResignationApprovalList({ requests, onAction, level }: ResignationApprovalListProps) {
  if (!requests || requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">No Requests</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {level === 'admin'
            ? 'There are no resignation requests in the system.'
            : 'There are no pending resignation requests for your review.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {requests.map((request: ResignationWithEmployee) => {
        const emp = request.employee
        const empName = emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown'
        const dept = emp?.department?.name || '-'
        const designation = emp?.designation?.title || '-'
        const canAct =
          (level === 'manager' && request.approval_status === 'submitted') ||
          (level === 'hr' && request.approval_status === 'manager_approved') ||
          level === 'admin'

        const colorClass = STATUS_COLORS[request.approval_status] || 'bg-gray-100 text-gray-700 border-gray-200'

        return (
          <Card key={request.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="flex items-center gap-4 py-4">
              {/* Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                {empName.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{empName}</p>
                  {emp?.employee_code && (
                    <span className="text-xs text-muted-foreground">({emp.employee_code})</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {designation} &middot; {dept}
                </p>
              </div>

              {/* Dates */}
              <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>{request.resignation_date ? formatDate(request.resignation_date) : '-'}</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5" />
                <span>{request.last_working_date ? formatDate(request.last_working_date) : '-'}</span>
              </div>

              {/* Exit Type + Status */}
              {request.exit_type && request.exit_type !== 'resignation' && (
                <Badge variant="outline" className={`capitalize shrink-0 ${EXIT_TYPE_COLORS[request.exit_type] || ''}`}>
                  {statusLabel(request.exit_type)}
                </Badge>
              )}
              <Badge variant="outline" className={`capitalize shrink-0 ${colorClass}`}>
                {statusLabel(request.approval_status)}
              </Badge>

              {/* Action */}
              {canAct && (
                <Button size="sm" variant="outline" onClick={() => onAction(request)}>
                  Review
                </Button>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
