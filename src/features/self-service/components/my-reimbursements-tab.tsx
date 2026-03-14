import { useState } from 'react'
import {
  Receipt, Plane, Stethoscope, Smartphone, Truck, GraduationCap, UtensilsCrossed,
  Plus, ExternalLink,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyReimbursements } from '../hooks/use-reimbursements'
import { ReimbursementFormDialog } from './reimbursement-form-dialog'
import { REIMBURSEMENT_CATEGORIES } from '@/lib/constants'

const CATEGORY_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  travel: { icon: Plane, color: 'bg-blue-50 text-blue-600' },
  medical: { icon: Stethoscope, color: 'bg-red-50 text-red-600' },
  mobile_internet: { icon: Smartphone, color: 'bg-violet-50 text-violet-600' },
  relocation: { icon: Truck, color: 'bg-amber-50 text-amber-600' },
  training: { icon: GraduationCap, color: 'bg-emerald-50 text-emerald-600' },
  meal_food: { icon: UtensilsCrossed, color: 'bg-orange-50 text-orange-600' },
}

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  pending_manager: { label: 'Pending Manager', color: 'bg-yellow-100 text-yellow-800' },
  manager_approved: { label: 'Manager Approved', color: 'bg-blue-100 text-blue-800' },
  manager_rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  pending_finance: { label: 'Pending Finance', color: 'bg-orange-100 text-orange-800' },
  finance_approved: { label: 'Finance Approved', color: 'bg-green-100 text-green-800' },
  finance_rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600' },
}

interface Props {
  employeeId: string
}

export function MyReimbursementsTab({ employeeId }: Props) {
  const { data: requests, isLoading } = useMyReimbursements(employeeId)
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
          My Reimbursements
        </h3>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Reimbursement
        </Button>
      </div>

      {!requests?.length ? (
        <div className="text-center py-8 text-muted-foreground">
          <Receipt className="mx-auto h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">No reimbursement requests yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => {
            const status = STATUS_STYLES[req.status] || STATUS_STYLES.draft
            const cfg = CATEGORY_ICONS[req.category] || { icon: Receipt, color: 'bg-gray-50 text-gray-600' }
            const Icon = cfg.icon
            const categoryLabel = REIMBURSEMENT_CATEGORIES.find(c => c.value === req.category)?.label || req.category

            return (
              <Card key={req.id} className="border-border/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{categoryLabel}</p>
                        <span className="text-sm font-semibold text-primary">
                          ₹{Number(req.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(req.expense_date).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                        {req.description && ` — ${req.description.slice(0, 50)}${req.description.length > 50 ? '...' : ''}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={status.color}>
                      {status.label}
                    </Badge>
                    {req.receipt_url && (
                      <a
                        href={req.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <ReimbursementFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        employeeId={employeeId}
      />
    </div>
  )
}
