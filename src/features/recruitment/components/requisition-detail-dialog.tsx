import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/shared/status-badge'
import { useCandidateApplications } from '../hooks/use-recruitment'
import { EMPLOYMENT_TYPES, APPLICATION_STATUSES } from '@/lib/constants'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { JobRequisitionWithRelations, CandidateApplicationWithRelations } from '@/types/database.types'

interface RequisitionDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requisition?: JobRequisitionWithRelations
}

export function RequisitionDetailDialog({ open, onOpenChange, requisition }: RequisitionDetailDialogProps) {
  const { data: applications } = useCandidateApplications(requisition?.id)

  if (!requisition) return null

  const dept = (requisition as unknown as Record<string, unknown>).department as { name: string } | undefined
  const hiringManager = (requisition as unknown as Record<string, unknown>).hiring_manager as { first_name: string; last_name: string } | undefined
  const empType = EMPLOYMENT_TYPES.find((t) => t.value === requisition.employment_type)?.label || requisition.employment_type

  // Count applications by status
  const statusCounts: Record<string, number> = {}
  const appList = (applications || []) as CandidateApplicationWithRelations[]
  for (const app of appList) {
    statusCounts[app.status] = (statusCounts[app.status] || 0) + 1
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {requisition.title}
            <StatusBadge status={requisition.status} />
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 pb-4">
            {/* Basic Info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Requisition Code" value={requisition.requisition_code} />
              <DetailField label="Department" value={dept?.name} />
              <DetailField label="Hiring Manager" value={hiringManager ? `${hiringManager.first_name} ${hiringManager.last_name}` : undefined} />
              <DetailField label="Employment Type" value={empType} />
              <DetailField label="Headcount" value={String(requisition.headcount || 1)} />
              <DetailField label="Location" value={requisition.location} />
            </div>

            {/* Experience & Salary */}
            {(requisition.min_experience != null || requisition.max_experience != null || requisition.budget?.min_salary != null || requisition.budget?.max_salary != null) && (
              <>
                <Separator />
                <div className="grid gap-3 sm:grid-cols-2">
                  {(requisition.min_experience != null || requisition.max_experience != null) && (
                    <DetailField
                      label="Experience Range"
                      value={`${requisition.min_experience ?? 0} - ${requisition.max_experience ?? 'Any'} years`}
                    />
                  )}
                  {/* The pay band is only present for HR, an admin, leadership
                      or the hiring manager — see migration 00046. */}
                  {(requisition.budget?.min_salary != null || requisition.budget?.max_salary != null) && (
                    <DetailField
                      label="Salary Range"
                      value={`${requisition.budget.min_salary ? formatCurrency(requisition.budget.min_salary) : 'N/A'} - ${requisition.budget.max_salary ? formatCurrency(requisition.budget.max_salary) : 'N/A'}`}
                    />
                  )}
                </div>
              </>
            )}

            {/* Description */}
            {requisition.description && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Job Description</p>
                  <p className="text-sm whitespace-pre-wrap">{requisition.description}</p>
                </div>
              </>
            )}

            {/* Requirements */}
            {requisition.requirements && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Requirements</p>
                  <p className="text-sm whitespace-pre-wrap">{requisition.requirements}</p>
                </div>
              </>
            )}

            {/* Dates */}
            <Separator />
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Created" value={requisition.created_at ? formatDate(requisition.created_at) : undefined} />
              <DetailField label="Last Updated" value={requisition.updated_at ? formatDate(requisition.updated_at) : undefined} />
            </div>

            {/* Application Pipeline Summary */}
            <Separator />
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                Applications ({appList.length} total)
              </p>
              {appList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No applications yet.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {APPLICATION_STATUSES.map((s) => {
                      const count = statusCounts[s.value] || 0
                      if (count === 0) return null
                      return (
                        <Badge key={s.value} variant="outline" className="text-xs">
                          {s.label}: {count}
                        </Badge>
                      )
                    })}
                  </div>

                  {/* Mini applications list */}
                  <div className="rounded-lg border divide-y">
                    {appList.slice(0, 10).map((app) => {
                      const candidate = (app as unknown as Record<string, unknown>).candidate as { first_name: string; last_name: string; email: string } | undefined
                      const stage = (app as unknown as Record<string, unknown>).current_stage as { stage_name: string } | undefined
                      return (
                        <div key={app.id} className="flex items-center justify-between px-4 py-2 text-sm">
                          <div>
                            <span className="font-medium">
                              {candidate ? `${candidate.first_name} ${candidate.last_name}` : 'Unknown'}
                            </span>
                            {candidate?.email && (
                              <span className="ml-2 text-muted-foreground">{candidate.email}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {stage && <Badge variant="outline" className="text-xs">{stage.stage_name}</Badge>}
                            <StatusBadge status={app.status} />
                          </div>
                        </div>
                      )
                    })}
                    {appList.length > 10 && (
                      <div className="px-4 py-2 text-xs text-muted-foreground text-center">
                        and {appList.length - 10} more...
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value || '-'}</p>
    </div>
  )
}
