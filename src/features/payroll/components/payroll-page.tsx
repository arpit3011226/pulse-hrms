import { PageHeader } from '@/components/layout/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions } from '@/hooks/use-permissions'
import { MyPayslipsTab } from './my-payslips-tab'
import { SalaryComponentsTab } from './salary-components-tab'
import { SalaryStructuresTab } from './salary-structures-tab'
import { CompensationTab } from './compensation-tab'
import { PayrollRunsTab } from './payroll-runs-tab'
import { TaxDeclarationForm } from './tax-declaration-form'
import { TaxDeclarationsTab } from './tax-declarations-tab'
import { PayrollConfigPanel } from './payroll-config-panel'
import { AllPayslipsTab } from './all-payslips-tab'
import { PayrollAdjustmentsTab } from './payroll-adjustments-tab'
import { TdsRecordsTab } from './tds-records-tab'

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
  const showTaxAdminTab = showAdminTabs || isHR
  const showSettingsTab = showAdminTabs

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
          {showAdminTabs && <TabsTrigger value="adjustments">Adjustments</TabsTrigger>}
          {showAdminTabs && <TabsTrigger value="all-payslips">All Payslips</TabsTrigger>}
          <TabsTrigger value="my-tax">My Tax</TabsTrigger>
          {showTaxAdminTab && <TabsTrigger value="tax-declarations">Income Tax</TabsTrigger>}
          {showTaxAdminTab && <TabsTrigger value="tds-records">TDS Records</TabsTrigger>}
          {showSettingsTab && <TabsTrigger value="settings">Settings</TabsTrigger>}
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

        {showAdminTabs && (
          <TabsContent value="adjustments" className="mt-6">
            <PayrollAdjustmentsTab />
          </TabsContent>
        )}

        {showAdminTabs && (
          <TabsContent value="all-payslips" className="mt-6">
            <AllPayslipsTab />
          </TabsContent>
        )}

        <TabsContent value="my-tax" className="mt-6">
          <TaxDeclarationForm />
        </TabsContent>

        {showTaxAdminTab && (
          <TabsContent value="tax-declarations" className="mt-6">
            <TaxDeclarationsTab />
          </TabsContent>
        )}

        {showTaxAdminTab && (
          <TabsContent value="tds-records" className="mt-6">
            <TdsRecordsTab />
          </TabsContent>
        )}

        {showSettingsTab && (
          <TabsContent value="settings" className="mt-6">
            <PayrollConfigPanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
