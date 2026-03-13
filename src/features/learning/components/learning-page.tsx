import { PageHeader } from '@/components/layout/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions } from '@/hooks/use-permissions'
import { CoursesTab } from './courses-tab'
import { CategoriesTab } from './categories-tab'
import { EnrollmentsTab } from './enrollments-tab'
import { MyLearningTab } from './my-learning-tab'
import { AssessmentsTab } from './assessments-tab'

export function LearningPage() {
  const { canManageLearning, isAdmin, isHR } = usePermissions()
  const canAdmin = canManageLearning || isAdmin || isHR

  return (
    <div>
      <PageHeader
        title="Learning & Development"
        description="Manage training courses, enrollments, and assessments."
      />

      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          {canAdmin && <TabsTrigger value="categories">Categories</TabsTrigger>}
          <TabsTrigger value="my-learning">My Learning</TabsTrigger>
          {canAdmin && <TabsTrigger value="enrollments">All Enrollments</TabsTrigger>}
          {canAdmin && <TabsTrigger value="assessments">Assessments</TabsTrigger>}
        </TabsList>

        <TabsContent value="courses" className="mt-6">
          <CoursesTab />
        </TabsContent>

        {canAdmin && (
          <TabsContent value="categories" className="mt-6">
            <CategoriesTab />
          </TabsContent>
        )}

        <TabsContent value="my-learning" className="mt-6">
          <MyLearningTab />
        </TabsContent>

        {canAdmin && (
          <TabsContent value="enrollments" className="mt-6">
            <EnrollmentsTab />
          </TabsContent>
        )}

        {canAdmin && (
          <TabsContent value="assessments" className="mt-6">
            <AssessmentsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
