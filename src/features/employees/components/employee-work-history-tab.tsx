import { useState } from 'react'
import { ArrowUpRight, ArrowRightLeft, UserCog, Briefcase, Calendar, Plus, Pencil, Trash2, Building2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { formatDate } from '@/lib/utils'
import { useWorkProfiles, useOrgHistory, usePreviousExperience, useDeletePreviousExperience } from '../hooks/use-employee-lifecycle'
import { EmployeePromotionDialog } from './employee-promotion-dialog'
import { PreviousExperienceForm } from './previous-experience-form'
import type { Employee, EmployeePreviousExperience } from '@/types/database.types'
import { EMPLOYMENT_TYPES } from '@/lib/constants'
import { toast } from 'sonner'

interface EmployeeWorkHistoryTabProps {
  employee: Employee
  departments: { id: string; name: string }[]
  designations: { id: string; title: string }[]
  managers: { id: string; first_name: string; last_name: string }[]
}

export function EmployeeWorkHistoryTab({ employee, departments, designations, managers }: EmployeeWorkHistoryTabProps) {
  const permissions = usePermissions()
  const { profile } = useAuth()
  const canManage = permissions.canManageWorkProfiles
  // Employee can manage their own experience, admins can manage anyone's
  const isOwnProfile = employee.profile_id === profile?.id
  const canManageExperience = canManage || isOwnProfile

  const { data: workProfiles, isLoading: loadingProfiles } = useWorkProfiles(employee.id)
  const { data: orgHistory, isLoading: loadingHistory } = useOrgHistory(employee.id)
  const { data: previousExperience, isLoading: loadingExperience } = usePreviousExperience(employee.id)
  const deleteExperience = useDeletePreviousExperience()

  const [promotionOpen, setPromotionOpen] = useState(false)
  const [experienceFormOpen, setExperienceFormOpen] = useState(false)
  const [editingExperience, setEditingExperience] = useState<EmployeePreviousExperience | undefined>()

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

  const handleEditExperience = (exp: EmployeePreviousExperience) => {
    setEditingExperience(exp)
    setExperienceFormOpen(true)
  }

  const handleDeleteExperience = async (id: string) => {
    try {
      await deleteExperience.mutateAsync(id)
      toast.success('Experience deleted')
    } catch {
      toast.error('Failed to delete experience')
    }
  }

  const getEmploymentTypeLabel = (value: string | null) => {
    if (!value) return null
    return EMPLOYMENT_TYPES.find((t) => t.value === value)?.label || value
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

              {orgHistory.map((record: any) => {
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

      {/* Previous Work Experience */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Previous Experience</CardTitle>
          {canManageExperience && (
            <Button size="sm" variant="outline" onClick={() => { setEditingExperience(undefined); setExperienceFormOpen(true) }}>
              <Plus className="mr-1 h-4 w-4" /> Add Experience
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingExperience ? (
            <div className="space-y-3"><Skeleton className="h-16 w-full" /></div>
          ) : !previousExperience?.length ? (
            <p className="text-sm text-muted-foreground">No previous experience recorded.</p>
          ) : (
            <div className="space-y-3">
              {previousExperience.map((exp) => (
                <div key={exp.id} className="flex items-start justify-between rounded-lg border p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium">{exp.company_name}</span>
                      {exp.employment_type && (
                        <Badge variant="secondary" className="text-xs">{getEmploymentTypeLabel(exp.employment_type)}</Badge>
                      )}
                    </div>
                    {exp.designation && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {exp.designation}{exp.department ? ` · ${exp.department}` : ''}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {formatDate(exp.start_date)} — {exp.end_date ? formatDate(exp.end_date) : 'Present'}
                      </span>
                      {exp.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {exp.location}
                        </span>
                      )}
                    </div>
                    {exp.reason_for_leaving && (
                      <p className="mt-1 text-xs text-muted-foreground italic">Left: {exp.reason_for_leaving}</p>
                    )}
                  </div>
                  {canManageExperience && (
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditExperience(exp)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteExperience(exp.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
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

      {/* Previous Experience Form Dialog */}
      <PreviousExperienceForm
        open={experienceFormOpen}
        onOpenChange={(open) => { setExperienceFormOpen(open); if (!open) setEditingExperience(undefined) }}
        employeeId={employee.id}
        experience={editingExperience}
      />
    </div>
  )
}
