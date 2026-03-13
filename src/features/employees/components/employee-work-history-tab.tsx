import { useState } from 'react'
import { ArrowUpRight, ArrowRightLeft, UserCog, Briefcase, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { usePermissions } from '@/hooks/use-permissions'
import { formatDate } from '@/lib/utils'
import { useWorkProfiles, useOrgHistory } from '../hooks/use-employee-lifecycle'
import { EmployeePromotionDialog } from './employee-promotion-dialog'
import type { Employee } from '@/types/database.types'

interface EmployeeWorkHistoryTabProps {
  employee: Employee
  departments: { id: string; name: string }[]
  designations: { id: string; title: string }[]
  managers: { id: string; first_name: string; last_name: string }[]
}

export function EmployeeWorkHistoryTab({ employee, departments, designations, managers }: EmployeeWorkHistoryTabProps) {
  const permissions = usePermissions()
  const canManage = permissions.canManageWorkProfiles
  const { data: workProfiles, isLoading: loadingProfiles } = useWorkProfiles(employee.id)
  const { data: orgHistory, isLoading: loadingHistory } = useOrgHistory(employee.id)
  const [promotionOpen, setPromotionOpen] = useState(false)

  const changeTypeIcons: Record<string, React.ElementType> = {
    promotion: ArrowUpRight,
    transfer: ArrowRightLeft,
    redesignation: Briefcase,
    manager_change: UserCog,
    initial_assignment: Calendar,
  }

  const changeTypeColors: Record<string, string> = {
    promotion: 'text-green-600 bg-green-50',
    transfer: 'text-blue-600 bg-blue-50',
    redesignation: 'text-purple-600 bg-purple-50',
    manager_change: 'text-orange-600 bg-orange-50',
    initial_assignment: 'text-gray-600 bg-gray-50',
  }

  return (
    <div className="space-y-6">
      {/* Current Assignment */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Current Assignment</CardTitle>
          {canManage && (
            <Button size="sm" onClick={() => setPromotionOpen(true)}>
              <ArrowUpRight className="mr-1 h-4 w-4" /> Promote / Transfer
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingProfiles ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="text-sm font-medium">{(workProfiles?.[0] as any)?.department?.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Designation</p>
                <p className="text-sm font-medium">{(workProfiles?.[0] as any)?.designation?.title || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reporting Manager</p>
                <p className="text-sm font-medium">
                  {(workProfiles?.[0] as any)?.reporting_manager
                    ? `${(workProfiles?.[0] as any)?.reporting_manager?.first_name} ${(workProfiles?.[0] as any)?.reporting_manager?.last_name}`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Effective From</p>
                <p className="text-sm font-medium">{workProfiles?.[0]?.effective_from ? formatDate(workProfiles[0].effective_from) : '-'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Organization Change Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization History</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
          ) : !orgHistory?.length ? (
            <p className="text-sm text-muted-foreground">No organizational changes recorded yet.</p>
          ) : (
            <div className="relative space-y-0">
              {/* Timeline line */}
              <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

              {orgHistory.map((record: any, index: number) => {
                const Icon = changeTypeIcons[record.change_type] || Calendar
                const colorClass = changeTypeColors[record.change_type] || 'text-gray-600 bg-gray-50'

                return (
                  <div key={record.id} className="relative flex gap-4 pb-6">
                    <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">{record.change_type.replace('_', ' ')}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(record.effective_from)}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                        {record.old_department && record.new_department && record.old_department.id !== record.new_department.id && (
                          <p>Department: {record.old_department.name} → {record.new_department.name}</p>
                        )}
                        {record.old_designation && record.new_designation && record.old_designation.id !== record.new_designation.id && (
                          <p>Designation: {record.old_designation.title} → {record.new_designation.title}</p>
                        )}
                        {record.remarks && <p className="italic">{record.remarks}</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Work Profile History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Work Profile History</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingProfiles ? (
            <div className="space-y-3"><Skeleton className="h-16 w-full" /></div>
          ) : !workProfiles?.length ? (
            <p className="text-sm text-muted-foreground">No work profiles recorded.</p>
          ) : (
            <div className="space-y-3">
              {workProfiles.map((profile: any) => (
                <div key={profile.id} className="flex items-start justify-between rounded-lg border p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{profile.designation?.title || 'N/A'}</span>
                      <span className="text-xs text-muted-foreground">|</span>
                      <span className="text-sm text-muted-foreground">{profile.department?.name || 'N/A'}</span>
                      {profile.is_current && <StatusBadge status="current" />}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatDate(profile.effective_from)} {profile.effective_to ? `— ${formatDate(profile.effective_to)}` : '— Present'}
                    </div>
                    {profile.change_reason && <p className="mt-1 text-xs text-muted-foreground italic">{profile.change_reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Promotion Dialog */}
      <EmployeePromotionDialog
        open={promotionOpen}
        onOpenChange={setPromotionOpen}
        employee={employee}
        departments={departments}
        designations={designations}
        managers={managers}
      />
    </div>
  )
}
