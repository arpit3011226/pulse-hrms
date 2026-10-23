import { PageHeader } from '@/components/layout/page-header'
import { DateRangeFilter } from '@/components/shared/date-range-filter'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions } from '@/hooks/use-permissions'
import { useModuleTab } from '@/hooks/use-module-tab'
import { RequisitionsTab } from './requisitions-tab'
import { PipelineStagesTab } from './pipeline-stages-tab'
import { CandidatesTab } from './candidates-tab'
import { ApplicationsTab } from './applications-tab'
import { InterviewsTab } from './interviews-tab'
import { OffersTab } from './offers-tab'
import { TalentPoolTab } from './talent-pool-tab'
import { BackgroundChecksTab } from './background-checks-tab'
import { HiringAnalyticsTab } from './hiring-analytics-tab'

export function RecruitmentPage() {
  const { canManageRecruitment, canViewCandidates, isAdmin, isHR } = usePermissions()

  const showAdminTabs = canManageRecruitment || isAdmin || isHR
  const showStagesTab = isAdmin
  const showViewTabs = canViewCandidates

  /**
   * The tab lives in the address bar, so the analytics summaries can link
   * straight to the detail behind each number — HR's note was that the
   * figures were a dead end.
   */
  const allowedTabs = [
    'requisitions',
    ...(showStagesTab ? ['stages'] : []),
    ...(showAdminTabs || showViewTabs ? ['candidates', 'applications', 'interviews'] : []),
    ...(showAdminTabs ? ['offers', 'pool', 'bgv', 'analytics'] : []),
  ]
  const [tab, setTab] = useModuleTab('requisitions', allowedTabs)

  return (
    <div>
      <PageHeader
        title="Recruitment"
        description="Manage job requisitions, candidates, interviews, and offers."
        actions={<DateRangeFilter />}
      />

      <Tabs value={tab} onValueChange={setTab}>
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
          {showAdminTabs && <TabsTrigger value="pool">Talent Pool</TabsTrigger>}
          {showAdminTabs && <TabsTrigger value="bgv">Background Checks</TabsTrigger>}
          {showAdminTabs && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
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

        {showAdminTabs && (
          <TabsContent value="pool" className="mt-6">
            <TalentPoolTab canManage={showAdminTabs} />
          </TabsContent>
        )}

        {showAdminTabs && (
          <TabsContent value="bgv" className="mt-6">
            <BackgroundChecksTab canManage={showAdminTabs} />
          </TabsContent>
        )}

        {showAdminTabs && (
          <TabsContent value="analytics" className="mt-6">
            <HiringAnalyticsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
