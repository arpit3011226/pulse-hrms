import { PageHeader } from '@/components/layout/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmployeeReportsTab } from './employee-reports-tab'
import { LeaveReportsTab } from './leave-reports-tab'
import { AttendanceReportsTab } from './attendance-reports-tab'
import { PayrollReportsTab } from './payroll-reports-tab'
import { RecruitmentReportsTab } from './recruitment-reports-tab'
import { LearningReportsTab } from './learning-reports-tab'

export function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="View organization-wide reports and export data."
      />

      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="recruitment">Recruitment</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-6">
          <EmployeeReportsTab />
        </TabsContent>
        <TabsContent value="leave" className="mt-6">
          <LeaveReportsTab />
        </TabsContent>
        <TabsContent value="attendance" className="mt-6">
          <AttendanceReportsTab />
        </TabsContent>
        <TabsContent value="payroll" className="mt-6">
          <PayrollReportsTab />
        </TabsContent>
        <TabsContent value="recruitment" className="mt-6">
          <RecruitmentReportsTab />
        </TabsContent>
        <TabsContent value="learning" className="mt-6">
          <LearningReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
