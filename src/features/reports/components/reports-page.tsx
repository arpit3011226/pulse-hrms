import { PageHeader } from '@/components/layout/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions } from '@/hooks/use-permissions'
import { EmployeeReportsTab } from './employee-reports-tab'
import { LeaveReportsTab } from './leave-reports-tab'
import { AttendanceReportsTab } from './attendance-reports-tab'
import { PayrollReportsTab } from './payroll-reports-tab'
import { RecruitmentReportsTab } from './recruitment-reports-tab'
import { PeopleAnalyticsTab } from './people-analytics-tab'
import { SentimentAnalyticsTab } from './sentiment-analytics-tab'
import { SurveyManagement } from './survey-management'

export function ReportsPage() {
  const { isAdmin, isHR } = usePermissions()
  const canManageSurveys = isAdmin || isHR

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="View organization-wide reports and export data."
      />

      <Tabs defaultValue="analytics">
        <TabsList className="flex-wrap">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          {canManageSurveys && <TabsTrigger value="surveys">Surveys</TabsTrigger>}
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="recruitment">Recruitment</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-6">
          <PeopleAnalyticsTab />
        </TabsContent>
        <TabsContent value="sentiment" className="mt-6">
          <SentimentAnalyticsTab />
        </TabsContent>
        {canManageSurveys && (
          <TabsContent value="surveys" className="mt-6">
            <SurveyManagement />
          </TabsContent>
        )}
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
      </Tabs>
    </div>
  )
}
