import { PageHeader } from '@/components/layout/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions } from '@/hooks/use-permissions'
import { MyLeavesTab } from './my-leaves-tab'
import { TeamLeavesTab } from './team-leaves-tab'
import { AllLeavesTab } from './all-leaves-tab'
import { LeavePoliciesTab } from './leave-policies-tab'
import { HolidaysTab } from './holidays-tab'
import { LeaveBalancesTab } from './leave-balances-tab'
import { LeaveEncashmentTab } from './leave-encashment-tab'
import { LeaveRulesTab } from './leave-rules-tab'

export function LeavePage() {
  const {
    canApproveLeave,
    canManageLeaveTypes,
    canManageLeavePolicies,
    canViewLeaveReports,
    isAdmin,
    isHR,
  } = usePermissions()

  const showTeamTab = canApproveLeave
  const showAllTab = isAdmin || isHR
  const showPoliciesTab = canManageLeavePolicies
  const showHolidaysTab = isAdmin || isHR || canManageLeaveTypes
  const showBalancesTab = canViewLeaveReports

  return (
    <div>
      <PageHeader
        title="Leave Management"
        description="Manage leave requests, policies, holidays, and balances."
      />

      <Tabs defaultValue="my-leaves">
        <TabsList>
          <TabsTrigger value="my-leaves">My Leaves</TabsTrigger>
          <TabsTrigger value="encashment">Encashment</TabsTrigger>
          {showTeamTab && <TabsTrigger value="team-leaves">Team Leaves</TabsTrigger>}
          {showAllTab && <TabsTrigger value="all-leaves">All Leaves</TabsTrigger>}
          {showPoliciesTab && <TabsTrigger value="policies">Policies</TabsTrigger>}
          {showPoliciesTab && <TabsTrigger value="rules">Rules</TabsTrigger>}
          {showHolidaysTab && <TabsTrigger value="holidays">Holidays</TabsTrigger>}
          {showBalancesTab && <TabsTrigger value="balances">Balances</TabsTrigger>}
        </TabsList>

        <TabsContent value="my-leaves" className="mt-6">
          <MyLeavesTab />
        </TabsContent>

        <TabsContent value="encashment" className="mt-6">
          <LeaveEncashmentTab />
        </TabsContent>

        {showTeamTab && (
          <TabsContent value="team-leaves" className="mt-6">
            <TeamLeavesTab />
          </TabsContent>
        )}

        {showAllTab && (
          <TabsContent value="all-leaves" className="mt-6">
            <AllLeavesTab />
          </TabsContent>
        )}

        {showPoliciesTab && (
          <TabsContent value="policies" className="mt-6">
            <LeavePoliciesTab />
          </TabsContent>
        )}

        {showPoliciesTab && (
          <TabsContent value="rules" className="mt-6">
            <LeaveRulesTab />
          </TabsContent>
        )}

        {showHolidaysTab && (
          <TabsContent value="holidays" className="mt-6">
            <HolidaysTab />
          </TabsContent>
        )}

        {showBalancesTab && (
          <TabsContent value="balances" className="mt-6">
            <LeaveBalancesTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
