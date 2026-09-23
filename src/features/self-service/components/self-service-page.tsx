import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, FileText, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { getCurrentEmployee } from '@/features/attendance/api/attendance.api'
import { MyLettersTab } from './my-letters-tab'
import { TemplatesTab } from './templates-tab'
import { LetterApprovalsTab } from './letter-approvals-tab'
import { AllLettersTab } from './all-letters-tab'
import { TemplateEditorDialog } from './template-editor-dialog'
import { HrGenerateLetterDialog } from './hr-generate-letter-dialog'
import { MyReimbursementsTab } from './my-reimbursements-tab'
import { ReimbursementApprovalsTab } from './reimbursement-approvals-tab'
import { AllReimbursementsTab } from './all-reimbursements-tab'
import { MyGeneralRequestsTab } from './my-general-requests-tab'
import { GeneralRequestApprovalsTab } from './general-request-approvals-tab'
import { MySurveysTab } from './my-surveys-tab'

export function SelfServicePage() {
  const { profile } = useAuth()
  const {
    isHR, isAdmin, isPayrollAdmin,
    canManageLetterTemplates, canApproveLettersAsManager,
    canApproveReimbursementsAsManager, canApproveReimbursementsAsFinance,
    canApproveGeneralRequestsAsManager,
  } = usePermissions()

  const { data: currentEmployee, isLoading: empLoading } = useQuery({
    queryKey: ['current-employee', profile?.id],
    queryFn: () => getCurrentEmployee(profile!.id),
    enabled: !!profile?.id,
  })

  const employeeId = currentEmployee?.id || ''

  const [templateOpen, setTemplateOpen] = useState(false)
  const [hrGenerateOpen, setHrGenerateOpen] = useState(false)
  const [approvalView, setApprovalView] = useState<string>('letters')
  const [allView, setAllView] = useState<string>('letters')

  const showTemplatesTab = canManageLetterTemplates
  const showApprovalsTab = canApproveLettersAsManager || canApproveReimbursementsAsManager || canApproveReimbursementsAsFinance || canApproveGeneralRequestsAsManager
  const showAllTab = isHR || isAdmin || isPayrollAdmin

  if (empLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Self Service"
        description="Request letters, reimbursements, and manage approvals."
        actions={
          <div className="flex gap-2">
            {canManageLetterTemplates && (
              <>
                <Button variant="outline" onClick={() => setTemplateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Template
                </Button>
                <Button onClick={() => setHrGenerateOpen(true)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Letter
                </Button>
              </>
            )}
          </div>
        }
      />

      <Tabs defaultValue="my-letters">
        <TabsList>
          <TabsTrigger value="my-letters">My Letters</TabsTrigger>
          <TabsTrigger value="my-reimbursements">Reimbursements</TabsTrigger>
          <TabsTrigger value="my-requests">Requests</TabsTrigger>
          <TabsTrigger value="my-surveys">Surveys</TabsTrigger>
          {showTemplatesTab && <TabsTrigger value="templates">Templates</TabsTrigger>}
          {showApprovalsTab && <TabsTrigger value="approvals">Approvals</TabsTrigger>}
          {showAllTab && <TabsTrigger value="all-requests">All Requests</TabsTrigger>}
        </TabsList>

        <TabsContent value="my-letters" className="mt-6">
          {employeeId ? (
            <MyLettersTab employeeId={employeeId} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No employee profile found for your account.
            </p>
          )}
        </TabsContent>

        <TabsContent value="my-reimbursements" className="mt-6">
          {employeeId ? (
            <MyReimbursementsTab employeeId={employeeId} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No employee profile found for your account.
            </p>
          )}
        </TabsContent>

        <TabsContent value="my-requests" className="mt-6">
          {employeeId ? (
            <MyGeneralRequestsTab employeeId={employeeId} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No employee profile found for your account.
            </p>
          )}
        </TabsContent>

        <TabsContent value="my-surveys" className="mt-6">
          {currentEmployee ? (
            <MySurveysTab employee={currentEmployee} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No employee profile found for your account.
            </p>
          )}
        </TabsContent>

        {showTemplatesTab && (
          <TabsContent value="templates" className="mt-6">
            <TemplatesTab />
          </TabsContent>
        )}

        {showApprovalsTab && (
          <TabsContent value="approvals" className="mt-6">
            <div className="space-y-4">
              <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
                {(['letters', 'reimbursements', 'requests'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setApprovalView(v)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize',
                      approvalView === v
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>

              {approvalView === 'letters' && (
                <LetterApprovalsTab approverEmployeeId={employeeId} />
              )}
              {approvalView === 'reimbursements' && (
                <ReimbursementApprovalsTab approverEmployeeId={employeeId} />
              )}
              {approvalView === 'requests' && (
                <GeneralRequestApprovalsTab approverEmployeeId={employeeId} />
              )}
            </div>
          </TabsContent>
        )}

        {showAllTab && (
          <TabsContent value="all-requests" className="mt-6">
            <div className="space-y-4">
              <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
                {(['letters', 'reimbursements'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setAllView(v)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize',
                      allView === v
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>

              {allView === 'letters' && <AllLettersTab />}
              {allView === 'reimbursements' && <AllReimbursementsTab />}
            </div>
          </TabsContent>
        )}
      </Tabs>

      <TemplateEditorDialog
        open={templateOpen}
        onOpenChange={setTemplateOpen}
      />

      <HrGenerateLetterDialog
        open={hrGenerateOpen}
        onOpenChange={setHrGenerateOpen}
      />
    </div>
  )
}
