import { PageHeader } from '@/components/layout/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions } from '@/hooks/use-permissions'
import { MyPayslipsTab } from './my-payslips-tab'
import { SalaryComponentsTab } from './salary-components-tab'
import { SalaryStructuresTab } from './salary-structures-tab'
import { CompensationTab } from './compensation-tab'
import { PayrollRunsTab } from './payroll-runs-tab'

export function PayrollPage() {
  const {
    canManagePayroll,
    canViewPayroll,
    isAdmin,
    isPayrollAdmin,
    isHR,
  } = usePermissions()

  const showAdminTabs = canManagePayroll || isAdmin || isPayrollAdmin
  const showCompensationTab = showAdminTabs || isHR
  const showComponentsTab = showAdminTabs
  const showStructuresTab = showAdminTabs
  const showRunsTab = showAdminTabs

  return (
    <div>
      <PageHeader
        title="Payroll & Compensation"
        description="Manage salary structures, employee compensation, and payroll processing."
      />

      <Tabs defaultValue="my-payslips">
        <TabsList>
          <TabsTrigger value="my-payslips">My Payslips</TabsTrigger>
          {showCompensationTab && <TabsTrigger value="compensation">Compensation</TabsTrigger>}
          {showComponentsTab && <TabsTrigger value="components">Components</TabsTrigger>}
          {showStructuresTab && <TabsTrigger value="structures">Structures</TabsTrigger>}
          {showRunsTab && <TabsTrigger value="runs">Payroll Runs</TabsTrigger>}
        </TabsList>

        <TabsContent value="my-payslips" className="mt-6">
          <MyPayslipsTab />
        </TabsContent>

        {showCompensationTab && (
          <TabsContent value="compensation" className="mt-6">
            <CompensationTab />
          </TabsContent>
        )}

        {showComponentsTab && (
          <TabsContent value="components" className="mt-6">
            <SalaryComponentsTab />
          </TabsContent>
        )}

        {showStructuresTab && (
          <TabsContent value="structures" className="mt-6">
            <SalaryStructuresTab />
          </TabsContent>
        )}

        {showRunsTab && (
          <TabsContent value="runs" className="mt-6">
            <PayrollRunsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
