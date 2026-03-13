import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyEnrollments, useCurrentEmployee } from '../hooks/use-learning'
import { getCourseModeLabel } from '../utils/learning-utils'
import { BookOpen, Clock, Award } from 'lucide-react'

export function MyLearningTab() {
  const { data: currentEmployee } = useCurrentEmployee()
  const { data: enrollments, isLoading } = useMyEnrollments(currentEmployee?.id)

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    )
  }

  if (!enrollments || enrollments.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p className="text-lg font-medium">No enrolled courses</p>
          <p className="text-sm">You have not been enrolled in any training courses yet.</p>
        </CardContent>
      </Card>
    )
  }

  const inProgress = enrollments.filter((e: any) => e.status === 'enrolled' || e.status === 'in_progress')
  const completed = enrollments.filter((e: any) => e.status === 'completed')
  const other = enrollments.filter((e: any) => e.status === 'dropped' || e.status === 'failed')

  const renderCards = (items: any[], title: string) => {
    if (items.length === 0) return null
    return (
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title} ({items.length})</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((enrollment: any) => (
            <Card key={enrollment.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <h4 className="font-medium leading-tight">{enrollment.course?.course_name}</h4>
                  <StatusBadge status={enrollment.status} />
                </div>
                <p className="mb-3 text-xs text-muted-foreground font-mono">{enrollment.course?.course_code}</p>

                <div className="mb-3 flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {getCourseModeLabel(enrollment.course?.mode ?? '')}
                  </span>
                  {enrollment.course?.duration_hours && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {enrollment.course.duration_hours}h
                    </span>
                  )}
                </div>

                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{enrollment.progress_percent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${enrollment.progress_percent}%` }}
                  />
                </div>

                {enrollment.completion_date && (
                  <div className="mt-3 flex items-center gap-1 text-xs text-emerald-600">
                    <Award className="h-3.5 w-3.5" />
                    Completed on {enrollment.completion_date}
                  </div>
                )}

                {enrollment.feedback_rating && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Rating: {enrollment.feedback_rating}/5
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {renderCards(inProgress, 'In Progress')}
      {renderCards(completed, 'Completed')}
      {renderCards(other, 'Other')}
    </div>
  )
}
