import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, UserMinus } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { getCurrentEmployee } from '@/features/attendance/api/attendance.api'
import { usePendingManagerApprovals, usePendingHRApprovals, useResignationRequests } from '../hooks/use-resignation'
import { MyResignationTab } from './my-resignation-tab'
import { ResignationApprovalList } from './resignation-approval-list'
import { ResignationActionDialog } from './resignation-action-dialog'
import { ClearanceTab } from './clearance-tab'
import { InitiateSeparationDialog } from './initiate-separation-dialog'

export function ResignationPage() {
  const { profile } = useAuth()
  const { isManager, isHR, isAdmin, isLeadership } = usePermissions()

  const { data: currentEmployee, isLoading: empLoading } = useQuery({
    queryKey: ['current-employee', profile?.id],
    queryFn: () => getCurrentEmployee(profile!.id),
    enabled: !!profile?.id,
  })

  const employeeId = currentEmployee?.id || ''

  // Manager approvals
  const { data: managerApprovals } = usePendingManagerApprovals(employeeId)

  // HR approvals
  const { data: hrApprovals } = usePendingHRApprovals()

  // All requests (admin/hr)
  const { data: allRequests } = useResignationRequests()

  // Action dialog state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [actionRequest, setActionRequest] = useState<any>(null)
  const [actionLevel, setActionLevel] = useState<'manager' | 'hr'>('manager')
  const [actionOpen, setActionOpen] = useState(false)
  const [separationOpen, setSeparationOpen] = useState(false)

  const showTeamTab = isManager
  const showAllTab = isHR || isAdmin
  const showClearanceTab = isHR || isAdmin
  const canInitiateSeparation = isManager || isHR || isAdmin || isLeadership

  if (empLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleManagerAction = (request: any) => {
    setActionRequest(request)
    setActionLevel('manager')
    setActionOpen(true)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleHRAction = (request: any) => {
    setActionRequest(request)
    setActionLevel('hr')
    setActionOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="Separation"
        description="Manage resignations, approvals, and exit clearances."
        actions={
          canInitiateSeparation ? (
            <Button onClick={() => setSeparationOpen(true)}>
              <UserMinus className="mr-2 h-4 w-4" />
              Initiate Separation
            </Button>
          ) : undefined
        }
      />

      <Tabs defaultValue="my-resignation">
        <TabsList>
          <TabsTrigger value="my-resignation">My Resignation</TabsTrigger>
          {showTeamTab && <TabsTrigger value="team-approvals">Team Approvals</TabsTrigger>}
          {showAllTab && <TabsTrigger value="all-requests">All Requests</TabsTrigger>}
          {showClearanceTab && <TabsTrigger value="clearances">Clearances</TabsTrigger>}
        </TabsList>

        <TabsContent value="my-resignation" className="mt-6">
          {employeeId ? (
            <MyResignationTab employeeId={employeeId} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No employee profile found for your account.
            </p>
          )}
        </TabsContent>

        {showTeamTab && (
          <TabsContent value="team-approvals" className="mt-6">
            <ResignationApprovalList
              requests={managerApprovals || []}
              onAction={handleManagerAction}
              level="manager"
            />
          </TabsContent>
        )}

        {showAllTab && (
          <TabsContent value="all-requests" className="mt-6">
            <ResignationApprovalList
              requests={allRequests || []}
              onAction={handleHRAction}
              level={isAdmin ? 'admin' : 'hr'}
            />
          </TabsContent>
        )}

        {showClearanceTab && (
          <TabsContent value="clearances" className="mt-6">
            <ClearanceTab approverEmployeeId={employeeId} />
          </TabsContent>
        )}
      </Tabs>

      <ResignationActionDialog
        open={actionOpen}
        onOpenChange={setActionOpen}
        request={actionRequest}
        level={actionLevel}
        approverEmployeeId={employeeId}
      />

      <InitiateSeparationDialog
        open={separationOpen}
        onOpenChange={setSeparationOpen}
      />
    </div>
  )
}
