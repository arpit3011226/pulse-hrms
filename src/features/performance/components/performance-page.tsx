import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/layout/page-header'
import { usePermissions } from '@/hooks/use-permissions'
import { MyGoalsTab } from './my-goals-tab'
import { MyReviewsTab } from './my-reviews-tab'
import { TeamReviewsTab } from './team-reviews-tab'
import { TeamGoalsTab } from './team-goals-tab'
import { GoalsAdminTab } from './goals-admin-tab'
import { AllReviewsTab } from './all-reviews-tab'
import { CyclesTab } from './cycles-tab'
import { CompetenciesTab } from './competencies-tab'
import { PipTab } from './pip-tab'
import { AnalyticsTab } from './analytics-tab'

export function PerformancePage() {
  const { canManagePerformance, isAdmin, isHR, isManager } = usePermissions()
  const canAdmin = canManagePerformance || isAdmin || isHR

  const [activeTab, setActiveTab] = useState('my-goals')

  return (
    <div>
      <PageHeader title="Performance" description="Manage goals, reviews, and performance improvement plans." />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-goals">My Goals</TabsTrigger>
          <TabsTrigger value="my-reviews">My Reviews</TabsTrigger>
          {(isManager || canAdmin) && <TabsTrigger value="team-goals">Team Goals</TabsTrigger>}
          {(isManager || canAdmin) && <TabsTrigger value="team-reviews">Team Reviews</TabsTrigger>}
          {canAdmin && <TabsTrigger value="all-goals">All Goals</TabsTrigger>}
          {canAdmin && <TabsTrigger value="all-reviews">All Reviews</TabsTrigger>}
          {(isManager || canAdmin) && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
          {canAdmin && <TabsTrigger value="cycles">Cycles</TabsTrigger>}
          {canAdmin && <TabsTrigger value="competencies">Competencies</TabsTrigger>}
          {canAdmin && <TabsTrigger value="pip">PIP</TabsTrigger>}
        </TabsList>

        <TabsContent value="my-goals" className="mt-6">
          <MyGoalsTab />
        </TabsContent>
        <TabsContent value="my-reviews" className="mt-6">
          <MyReviewsTab />
        </TabsContent>
        {(isManager || canAdmin) && (
          <TabsContent value="team-goals" className="mt-6">
            <TeamGoalsTab />
          </TabsContent>
        )}
        {(isManager || canAdmin) && (
          <TabsContent value="team-reviews" className="mt-6">
            <TeamReviewsTab />
          </TabsContent>
        )}
        {canAdmin && (
          <TabsContent value="all-goals" className="mt-6">
            <GoalsAdminTab />
          </TabsContent>
        )}
        {canAdmin && (
          <TabsContent value="all-reviews" className="mt-6">
            <AllReviewsTab />
          </TabsContent>
        )}
        {(isManager || canAdmin) && (
          <TabsContent value="analytics" className="mt-6">
            <AnalyticsTab />
          </TabsContent>
        )}
        {canAdmin && (
          <TabsContent value="cycles" className="mt-6">
            <CyclesTab />
          </TabsContent>
        )}
        {canAdmin && (
          <TabsContent value="competencies" className="mt-6">
            <CompetenciesTab />
          </TabsContent>
        )}
        {canAdmin && (
          <TabsContent value="pip" className="mt-6">
            <PipTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
