import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useCurrentEmployee, useSubmitManagerReview } from '../hooks/use-performance'
import { formatRating } from '../utils/performance-utils'
import { RATING_SCALE } from '@/lib/constants'
import type { PerformanceReviewWithRelations } from '@/types/database.types'

const managerReviewSchema = z.object({
  rating: z.coerce
    .number()
    .min(RATING_SCALE.MIN, `Minimum rating is ${RATING_SCALE.MIN}`)
    .max(RATING_SCALE.MAX, `Maximum rating is ${RATING_SCALE.MAX}`),
  strengths: z.string().optional(),
  areas_for_improvement: z.string().optional(),
  development_plan: z.string().optional(),
  comments: z.string().optional(),
})

type ManagerReviewFormData = z.output<typeof managerReviewSchema>

interface ManagerReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  review: PerformanceReviewWithRelations
}

export function ManagerReviewDialog({ open, onOpenChange, review }: ManagerReviewDialogProps) {
  const { data: currentEmployee } = useCurrentEmployee()
  const submitManagerReview = useSubmitManagerReview()

  const existing = review.manager_review
  const selfReview = review.self_review
  const employeeName = review.employee
    ? `${review.employee.first_name} ${review.employee.last_name}`
    : 'Employee'

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof managerReviewSchema>, unknown, ManagerReviewFormData>({
    resolver: zodResolver(managerReviewSchema),
    defaultValues: {
      rating: existing?.rating ?? undefined,
      strengths: existing?.strengths ?? '',
      areas_for_improvement: existing?.areas_for_improvement ?? '',
      development_plan: existing?.development_plan ?? '',
      comments: existing?.comments ?? '',
    },
  })

  const onSubmit = async (data: ManagerReviewFormData) => {
    if (!currentEmployee) {
      toast.error('Unable to identify current employee')
      return
    }

    try {
      await submitManagerReview.mutateAsync({
        ...(existing?.id ? { id: existing.id } : {}),
        performance_review_id: review.id,
        manager_id: currentEmployee.id,
        rating: data.rating,
        strengths: data.strengths || null,
        areas_for_improvement: data.areas_for_improvement || null,
        development_plan: data.development_plan || null,
        comments: data.comments || null,
        submitted_at: new Date().toISOString(),
      })

      toast.success('Manager review submitted successfully')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to submit manager review')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review: {employeeName}</DialogTitle>
        </DialogHeader>

        {selfReview?.submitted_at && (
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <h4 className="text-sm font-semibold">Self Review Summary</h4>
            <div className="grid gap-2 text-sm">
              <div>
                <span className="font-medium">Self Rating:</span>{' '}
                {formatRating(selfReview.self_rating)}
              </div>
              {selfReview.strengths && (
                <div>
                  <span className="font-medium">Strengths:</span>{' '}
                  <span className="text-muted-foreground">{selfReview.strengths}</span>
                </div>
              )}
              {selfReview.achievements && (
                <div>
                  <span className="font-medium">Achievements:</span>{' '}
                  <span className="text-muted-foreground">{selfReview.achievements}</span>
                </div>
              )}
              {selfReview.areas_for_improvement && (
                <div>
                  <span className="font-medium">Areas for Improvement:</span>{' '}
                  <span className="text-muted-foreground">{selfReview.areas_for_improvement}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rating">Manager Rating * (1.0 - 5.0)</Label>
            <Input
              id="rating"
              type="number"
              min={RATING_SCALE.MIN}
              max={RATING_SCALE.MAX}
              step={RATING_SCALE.STEP}
              {...register('rating')}
            />
            {errors.rating && (
              <p className="text-sm text-destructive">{errors.rating.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="strengths">Strengths</Label>
            <Textarea
              id="strengths"
              rows={3}
              placeholder="Employee's key strengths..."
              {...register('strengths')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="areas_for_improvement">Areas for Improvement</Label>
            <Textarea
              id="areas_for_improvement"
              rows={3}
              placeholder="Areas where the employee can improve..."
              {...register('areas_for_improvement')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="development_plan">Development Plan</Label>
            <Textarea
              id="development_plan"
              rows={3}
              placeholder="Suggested development plan..."
              {...register('development_plan')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Additional Comments</Label>
            <Textarea
              id="comments"
              rows={3}
              placeholder="Any additional comments..."
              {...register('comments')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitManagerReview.isPending}>
              {submitManagerReview.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Manager Review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
