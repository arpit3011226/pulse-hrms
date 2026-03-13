import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { getCourseModeLabel } from '../utils/learning-utils'
import { useCourseEnrollments, useAssessments } from '../hooks/use-learning'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: any
}

export function CourseDetailDialog({ open, onOpenChange, course }: Props) {
  const { data: enrollments } = useCourseEnrollments(course?.id)
  const { data: assessments } = useAssessments(course?.id)

  if (!course) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {course.course_name}
            <StatusBadge status={course.status} />
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Code:</span>{' '}
                <span className="font-medium">{course.course_code}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Mode:</span>{' '}
                <span className="font-medium">{getCourseModeLabel(course.mode)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Category:</span>{' '}
                <span className="font-medium">{course.category?.category_name || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>{' '}
                <span className="font-medium">{course.duration_hours ? `${course.duration_hours}h` : '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Instructor:</span>{' '}
                <span className="font-medium">{course.instructor_name || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Max Participants:</span>{' '}
                <span className="font-medium">{course.max_participants || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Mandatory:</span>{' '}
                <Badge variant={course.is_mandatory ? 'default' : 'secondary'}>
                  {course.is_mandatory ? 'Yes' : 'No'}
                </Badge>
              </div>
              {course.creator && (
                <div>
                  <span className="text-muted-foreground">Created By:</span>{' '}
                  <span className="font-medium">
                    {course.creator.first_name} {course.creator.last_name}
                  </span>
                </div>
              )}
            </div>

            {course.description && (
              <>
                <Separator />
                <div>
                  <h4 className="mb-1 text-sm font-medium">Description</h4>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{course.description}</p>
                </div>
              </>
            )}

            {course.syllabus && (
              <div>
                <h4 className="mb-1 text-sm font-medium">Syllabus</h4>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{course.syllabus}</p>
              </div>
            )}

            {course.prerequisites && (
              <div>
                <h4 className="mb-1 text-sm font-medium">Prerequisites</h4>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{course.prerequisites}</p>
              </div>
            )}

            <Separator />

            <div>
              <h4 className="mb-2 text-sm font-medium">Enrollments ({enrollments?.length ?? 0})</h4>
              {enrollments && enrollments.length > 0 ? (
                <div className="space-y-1">
                  {enrollments.map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                      <span>{e.employee?.first_name} {e.employee?.last_name} ({e.employee?.employee_code})</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{e.progress_percent}%</span>
                        <StatusBadge status={e.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No enrollments yet.</p>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-medium">Assessments ({assessments?.length ?? 0})</h4>
              {assessments && assessments.length > 0 ? (
                <div className="space-y-1">
                  {assessments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                      <span>{a.assessment_name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{a.assessment_type.replace(/_/g, ' ')}</Badge>
                        <span className="text-muted-foreground">{a.passing_marks}/{a.total_marks}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No assessments yet.</p>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
