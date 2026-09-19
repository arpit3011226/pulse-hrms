import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Pencil, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useEmployee, useEmployees } from '../../hooks/use-employees'
import { usePermissions } from '@/hooks/use-permissions'
import { useEmployeeCompensation } from '@/features/payroll/hooks/use-payroll'
import { HubProfileCard } from './hub-profile-card'
import { HubQuickTiles, type HubPanel } from './hub-quick-tiles'
import { HubAttendancePanel } from './hub-attendance-panel'
import { HubTimeOffPanel } from './hub-time-off-panel'
import { HubReviewsPanel } from './hub-reviews-panel'
import { HubGoalsPanel } from './hub-goals-panel'
import { HubDocumentsPanel } from './hub-documents-panel'
import { HubPayrollPanel } from './hub-payroll-panel'
import { HubOffboardingSection } from './hub-offboarding-section'

interface EmployeeLifecycleHubProps {
  employeeId: string
}

function formatLakhs(amount: number): string {
  if (amount >= 100000) {
    const lakhs = amount / 100000
    return `${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)}L`
  }
  return `₹${amount.toLocaleString('en-IN')}`
}

export function EmployeeLifecycleHub({ employeeId }: EmployeeLifecycleHubProps) {
  const [activePanel, setActivePanel] = useState<HubPanel>('attendance')
  const { data: employee, isLoading } = useEmployee(employeeId)
  const { data: allEmployees } = useEmployees()
  const permissions = usePermissions()
  const { data: compensation } = useEmployeeCompensation(employeeId)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!employee) {
    return <div className="py-16 text-center text-muted-foreground">Employee not found</div>
  }

  const emp = employee as typeof employee & {
    department?: { id: string; name: string } | null
    designation?: { id: string; title: string } | null
  }

  // Resolve manager name
  const manager = allEmployees?.find((e) => e.id === emp.reporting_manager_id)
  const managerName = manager ? `${manager.first_name} ${manager.last_name.charAt(0)}.` : null

  // CTC from compensation
  const comp = compensation as typeof compensation & { monthly_gross?: number } | null
  const monthlyGross = comp?.monthly_gross ?? 0
  const ctcDisplay = monthlyGross > 0 ? formatLakhs(monthlyGross * 12) : null

  const isExiting = ['on_notice', 'resigned', 'terminated', 'absconding'].includes(emp.status)

  // Determine visible tiles based on permissions
  const visibleTiles: HubPanel[] = ['attendance', 'time-off']
  if (permissions.canViewPerformance) visibleTiles.push('reviews')
  visibleTiles.push('documents')
  if (permissions.canViewPerformance) visibleTiles.push('goals')
  if (permissions.canViewPayroll) visibleTiles.push('payroll')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/employees"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Employee Lifecycle</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link
              to="/employees/$employeeId"
              params={{ employeeId }}
              search={{ view: 'details' }}
              className="gap-1.5 text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Full Details
            </Link>
          </Button>
          {permissions.canManageEmployees && (
            <Button size="sm" asChild>
              <Link to="/employees/$employeeId/edit" params={{ employeeId }}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Profile card */}
      <HubProfileCard
        employee={emp}
        managerName={managerName}
        ctcDisplay={ctcDisplay}
      />

      {/* Quick action tiles */}
      <HubQuickTiles
        active={activePanel}
        onChange={setActivePanel}
        visibleTiles={visibleTiles}
      />

      {/* Active panel content */}
      <div>
        {activePanel === 'attendance' && <HubAttendancePanel employeeId={employeeId} />}
        {activePanel === 'time-off' && (
          <HubTimeOffPanel employeeId={employeeId} canApprove={permissions.canApproveLeave} />
        )}
        {activePanel === 'reviews' && <HubReviewsPanel employeeId={employeeId} />}
        {activePanel === 'documents' && <HubDocumentsPanel employeeId={employeeId} />}
        {activePanel === 'goals' && <HubGoalsPanel employeeId={employeeId} />}
        {activePanel === 'payroll' && <HubPayrollPanel employeeId={employeeId} />}
      </div>

      {/* Offboarding section (conditional) */}
      {isExiting && <HubOffboardingSection employeeId={employeeId} />}
    </div>
  )
}
