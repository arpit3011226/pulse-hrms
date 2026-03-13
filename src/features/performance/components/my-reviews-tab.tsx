import { useState } from 'react'
import { Loader2, CheckCircle2, Circle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  useCurrentEmployee,
  useActiveCycle,
  useMyReview,
  useUpdatePerformanceReviewStatus,
} from '../hooks/use-performance'
import { formatRating, getRatingLabel, getRatingColor, getRatingBgColor, getReviewStatusStep } from '../utils/performance-utils'
import { SelfReviewDialog } from './self-review-dialog'

const STEPS = [
  { label: 'Draft', key: 'draft' },
  { label: 'Self Review', key: 'self_review_pending' },
  { label: 'Self Review Done', key: 'self_review_done' },
  { label: 'Manager Review', key: 'manager_review_pending' },
  { label: 'Manager Review Done', key: 'manager_review_done' },
  { label: 'Acknowledged', key: 'acknowledged' },
  { label: 'Finalized', key: 'finalized' },
]

export function MyReviewsTab() {
  const { data: employee, isLoading: empLoading } = useCurrentEmployee()
  const { data: activeCycle, isLoading: cycleLoading } = useActiveCycle()
  const { data: review, isLoading: reviewLoading } = useMyReview(
    employee?.id || '',
    activeCycle?.id || ''
  )
  const updateStatus = useUpdatePerformanceReviewStatus()

  const [selfReviewOpen, setSelfReviewOpen] = useState(false)

  const isLoading = empLoading || cycleLoading || reviewLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!activeCycle) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No active performance cycle found.
        </CardContent>
      </Card>
    )
  }

  if (!employee) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Unable to identify your employee record.
        </CardContent>
      </Card>
    )
  }

  if (!review) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No review found for the current cycle: {activeCycle.cycle_name}
        </CardContent>
      </Card>
    )
  }

  const currentStep = getReviewStatusStep(review.status)

  const handleAcknowledge = async () => {
    try {
      await updateStatus.mutateAsync({ id: review.id, status: 'acknowledged' })
      toast.success('Review acknowledged')
    } catch {
      toast.error('Failed to acknowledge review')
    }
  }

  const canSubmitSelfReview =
    review.status === 'self_review_pending' || review.status === 'draft'
  const canAcknowledge = review.status === 'manager_review_done'
  const isFinalized = review.status === 'finalized'

  return (
    <div className="space-y-6">
      {/* Cycle Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {activeCycle.cycle_name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Stepper */}
          <div className="flex items-center gap-1">
            {STEPS.map((step, idx) => {
              const isCompleted = idx < currentStep
              const isCurrent = idx === currentStep
              return (
                <div key={step.key} className="flex items-center gap-1">
                  <div className="flex flex-col items-center">
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : isCurrent ? (
                      <Clock className="h-5 w-5 text-blue-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/40" />
                    )}
                    <span
                      className={`mt-1 text-[10px] leading-tight text-center max-w-[70px] ${
                        isCurrent
                          ? 'font-semibold text-blue-600'
                          : isCompleted
                            ? 'text-emerald-600'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`h-0.5 w-6 ${
                        idx < currentStep ? 'bg-emerald-400' : 'bg-muted-foreground/20'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Self Review Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Self Review</CardTitle>
          {canSubmitSelfReview && (
            <Button size="sm" onClick={() => setSelfReviewOpen(true)}>
              {review.self_review?.submitted_at ? 'Update Self Review' : 'Submit Self Review'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {review.self_review?.submitted_at ? (
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Self Rating:</span>{' '}
                <span className={getRatingColor(review.self_review.self_rating ?? 0)}>
                  {formatRating(review.self_review.self_rating)}
                </span>
              </div>
              {review.self_review.strengths && (
                <div>
                  <span className="font-medium">Strengths:</span>
                  <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{review.self_review.strengths}</p>
                </div>
              )}
              {review.self_review.areas_for_improvement && (
                <div>
                  <span className="font-medium">Areas for Improvement:</span>
                  <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{review.self_review.areas_for_improvement}</p>
                </div>
              )}
              {review.self_review.achievements && (
                <div>
                  <span className="font-medium">Achievements:</span>
                  <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{review.self_review.achievements}</p>
                </div>
              )}
              {review.self_review.comments && (
                <div>
                  <span className="font-medium">Comments:</span>
                  <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{review.self_review.comments}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {canSubmitSelfReview
                ? 'Self review has not been submitted yet. Click the button above to start.'
                : 'Self review is not available at this stage.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Manager Review Section */}
      {(currentStep >= 4 || review.manager_review?.submitted_at) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manager Review</CardTitle>
          </CardHeader>
          <CardContent>
            {review.manager_review?.submitted_at ? (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Manager Rating:</span>{' '}
                  <span className={getRatingColor(review.manager_review.rating ?? 0)}>
                    {formatRating(review.manager_review.rating)}
                  </span>
                </div>
                {review.manager_review.strengths && (
                  <div>
                    <span className="font-medium">Strengths:</span>
                    <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{review.manager_review.strengths}</p>
                  </div>
                )}
                {review.manager_review.areas_for_improvement && (
                  <div>
                    <span className="font-medium">Areas for Improvement:</span>
                    <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{review.manager_review.areas_for_improvement}</p>
                  </div>
                )}
                {review.manager_review.development_plan && (
                  <div>
                    <span className="font-medium">Development Plan:</span>
                    <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{review.manager_review.development_plan}</p>
                  </div>
                )}
                {review.manager_review.comments && (
                  <div>
                    <span className="font-medium">Comments:</span>
                    <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{review.manager_review.comments}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Manager review has not been submitted yet.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Final Rating */}
      {isFinalized && review.final_rating !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Final Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <span
                className={`inline-flex items-center rounded-md px-3 py-1 text-sm font-semibold ${getRatingBgColor(review.final_rating)}`}
              >
                {formatRating(review.final_rating)}
              </span>
              {review.rating_label && (
                <span className="text-sm text-muted-foreground">
                  {getRatingLabel(review.final_rating)}
                </span>
              )}
            </div>
            {review.overall_comments && (
              <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
                {review.overall_comments}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Acknowledge Button */}
      {canAcknowledge && (
        <div className="flex justify-end">
          <Button onClick={handleAcknowledge} disabled={updateStatus.isPending}>
            {updateStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Acknowledge Review
          </Button>
        </div>
      )}

      {/* Self Review Dialog */}
      <SelfReviewDialog
        open={selfReviewOpen}
        onOpenChange={setSelfReviewOpen}
        reviewId={review.id}
        existing={review.self_review}
      />
    </div>
  )
}
