import { PageHeader } from '@/components/layout/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions } from '@/hooks/use-permissions'
import { RequisitionsTab } from './requisitions-tab'
import { PipelineStagesTab } from './pipeline-stages-tab'
import { CandidatesTab } from './candidates-tab'
import { ApplicationsTab } from './applications-tab'
import { InterviewsTab } from './interviews-tab'
import { OffersTab } from './offers-tab'

export function RecruitmentPage() {
  const { canManageRecruitment, canViewCandidates, isAdmin, isHR } = usePermissions()

  const showAdminTabs = canManageRecruitment || isAdmin || isHR
  const showStagesTab = isAdmin
  const showViewTabs = canViewCandidates

  return (
    <div>
      <PageHeader
        title="Recruitment"
        description="Manage job requisitions, candidates, interviews, and offers."
      />

      <Tabs defaultValue="requisitions">
        <TabsList>
          <TabsTrigger value="requisitions">Requisitions</TabsTrigger>
          {showStagesTab && <TabsTrigger value="stages">Pipeline Stages</TabsTrigger>}
          {(showAdminTabs || showViewTabs) && (
            <TabsTrigger value="candidates">Candidates</TabsTrigger>
          )}
          {(showAdminTabs || showViewTabs) && (
            <TabsTrigger value="applications">Applications</TabsTrigger>
          )}
          {(showAdminTabs || showViewTabs) && (
            <TabsTrigger value="interviews">Interviews</TabsTrigger>
          )}
          {showAdminTabs && <TabsTrigger value="offers">Offers</TabsTrigger>}
        </TabsList>

        <TabsContent value="requisitions" className="mt-6">
          <RequisitionsTab />
        </TabsContent>

        {showStagesTab && (
          <TabsContent value="stages" className="mt-6">
            <PipelineStagesTab />
          </TabsContent>
        )}

        {(showAdminTabs || showViewTabs) && (
          <TabsContent value="candidates" className="mt-6">
            <CandidatesTab />
          </TabsContent>
        )}

        {(showAdminTabs || showViewTabs) && (
          <TabsContent value="applications" className="mt-6">
            <ApplicationsTab />
          </TabsContent>
        )}

        {(showAdminTabs || showViewTabs) && (
          <TabsContent value="interviews" className="mt-6">
            <InterviewsTab />
          </TabsContent>
        )}

        {showAdminTabs && (
          <TabsContent value="offers" className="mt-6">
            <OffersTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
