import { PageHeader } from '@/components/layout/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions } from '@/hooks/use-permissions'
import { MyAttendanceTab } from './my-attendance-tab'
import { TeamAttendanceTab } from './team-attendance-tab'
import { AllAttendanceTab } from './all-attendance-tab'
import { ShiftsTab } from './shifts-tab'
import { AllRegularizationsTab } from './all-regularizations-tab'

export function AttendancePage() {
  const {
    canViewAttendance,
    canManageAttendance,
    canManageShifts,
    isAdmin,
    isHR,
    isManager,
  } = usePermissions()

  const showTeamTab = canViewAttendance && isManager
  const showAllTab = isAdmin || isHR || canManageAttendance
  const showShiftsTab = isAdmin || isHR || canManageShifts

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Track attendance, manage shifts, and handle regularization requests."
      />

      <Tabs defaultValue="my-attendance">
        <TabsList>
          <TabsTrigger value="my-attendance">My Attendance</TabsTrigger>
          {showTeamTab && <TabsTrigger value="team">Team</TabsTrigger>}
          {showAllTab && <TabsTrigger value="all">All Attendance</TabsTrigger>}
          {showAllTab && <TabsTrigger value="regularizations">Regularisations</TabsTrigger>}
          {showShiftsTab && <TabsTrigger value="shifts">Shifts</TabsTrigger>}
        </TabsList>

        <TabsContent value="my-attendance" className="mt-6">
          <MyAttendanceTab />
        </TabsContent>

        {showTeamTab && (
          <TabsContent value="team" className="mt-6">
            <TeamAttendanceTab />
          </TabsContent>
        )}

        {showAllTab && (
          <TabsContent value="all" className="mt-6">
            <AllAttendanceTab />
          </TabsContent>
        )}

        {showAllTab && (
          <TabsContent value="regularizations" className="mt-6">
            <AllRegularizationsTab />
          </TabsContent>
        )}

        {showShiftsTab && (
          <TabsContent value="shifts" className="mt-6">
            <ShiftsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
