import { useState } from 'react'
import {
  CreditCard, Monitor, Home, Clock, Timer, Plus, ClipboardList,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyGeneralRequests } from '../hooks/use-general-requests'
import { GeneralRequestFormDialog } from './general-request-form-dialog'
import { GENERAL_REQUEST_TYPES } from '@/lib/constants'

const TYPE_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  id_card_request: { icon: CreditCard, color: 'bg-blue-50 text-blue-600' },
  asset_request: { icon: Monitor, color: 'bg-violet-50 text-violet-600' },
  wfh_request: { icon: Home, color: 'bg-emerald-50 text-emerald-600' },
  shift_change_request: { icon: Clock, color: 'bg-amber-50 text-amber-600' },
  overtime_request: { icon: Timer, color: 'bg-red-50 text-red-600' },
}

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  pending_manager: { label: 'Pending Manager', color: 'bg-yellow-100 text-yellow-800' },
  manager_approved: { label: 'Manager Approved', color: 'bg-blue-100 text-blue-800' },
  manager_rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  pending_hr: { label: 'Pending HR', color: 'bg-orange-100 text-orange-800' },
  hr_approved: { label: 'HR Approved', color: 'bg-green-100 text-green-800' },
  hr_rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600' },
}

interface Props {
  employeeId: string
}

export function MyGeneralRequestsTab({ employeeId }: Props) {
  const { data: requests, isLoading } = useMyGeneralRequests(employeeId)
  const [formOpen, setFormOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          My Requests
        </h3>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      {!requests?.length ? (
        <div className="text-center py-8 text-muted-foreground">
          <ClipboardList className="mx-auto h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">No requests yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => {
            const status = STATUS_STYLES[req.status] || STATUS_STYLES.pending_manager
            const cfg = TYPE_ICONS[req.request_type] || { icon: ClipboardList, color: 'bg-gray-50 text-gray-600' }
            const Icon = cfg.icon
            const typeLabel = GENERAL_REQUEST_TYPES.find(t => t.value === req.request_type)?.label || req.request_type

            return (
              <Card key={req.id} className="border-border/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{req.title}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">{typeLabel}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                        {req.description && ` — ${req.description.slice(0, 40)}${req.description.length > 40 ? '...' : ''}`}
                      </p>
                    </div>
                  </div>

                  <Badge variant="outline" className={`shrink-0 ${status.color}`}>
                    {status.label}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <GeneralRequestFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        employeeId={employeeId}
      />
    </div>
  )
}
