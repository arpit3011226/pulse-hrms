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
import { useSubmitSelfReview } from '../hooks/use-performance'
import { RATING_SCALE } from '@/lib/constants'
import type { SelfReview } from '@/types/database.types'

const selfReviewSchema = z.object({
  self_rating: z.coerce
    .number()
    .min(RATING_SCALE.MIN, `Minimum rating is ${RATING_SCALE.MIN}`)
    .max(RATING_SCALE.MAX, `Maximum rating is ${RATING_SCALE.MAX}`),
  strengths: z.string().optional(),
  areas_for_improvement: z.string().optional(),
  achievements: z.string().optional(),
  comments: z.string().optional(),
})

type SelfReviewFormData = z.output<typeof selfReviewSchema>

interface SelfReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reviewId: string
  existing?: SelfReview | null
}

export function SelfReviewDialog({ open, onOpenChange, reviewId, existing }: SelfReviewDialogProps) {
  const submitSelfReview = useSubmitSelfReview()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof selfReviewSchema>, unknown, SelfReviewFormData>({
    resolver: zodResolver(selfReviewSchema),
    defaultValues: {
      self_rating: existing?.self_rating ?? undefined,
      strengths: existing?.strengths ?? '',
      areas_for_improvement: existing?.areas_for_improvement ?? '',
      achievements: existing?.achievements ?? '',
      comments: existing?.comments ?? '',
    },
  })

  const onSubmit = async (data: SelfReviewFormData) => {
    try {
      await submitSelfReview.mutateAsync({
        ...(existing?.id ? { id: existing.id } : {}),
        performance_review_id: reviewId,
        self_rating: data.self_rating,
        strengths: data.strengths || null,
        areas_for_improvement: data.areas_for_improvement || null,
        achievements: data.achievements || null,
        comments: data.comments || null,
        submitted_at: new Date().toISOString(),
      })

      toast.success('Self review submitted successfully')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to submit self review')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle>{existing?.submitted_at ? 'Update Self Review' : 'Submit Self Review'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="self_rating">Self Rating * (1.0 - 5.0)</Label>
            <Input
              id="self_rating"
              type="number"
              min={RATING_SCALE.MIN}
              max={RATING_SCALE.MAX}
              step={RATING_SCALE.STEP}
              {...register('self_rating')}
            />
            {errors.self_rating && (
              <p className="text-sm text-destructive">{errors.self_rating.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="strengths">Strengths</Label>
            <Textarea
              id="strengths"
              rows={3}
              placeholder="Describe your key strengths..."
              {...register('strengths')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="areas_for_improvement">Areas for Improvement</Label>
            <Textarea
              id="areas_for_improvement"
              rows={3}
              placeholder="Areas you would like to improve..."
              {...register('areas_for_improvement')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="achievements">Achievements</Label>
            <Textarea
              id="achievements"
              rows={3}
              placeholder="Key achievements during this period..."
              {...register('achievements')}
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
            <Button type="submit" disabled={submitSelfReview.isPending}>
              {submitSelfReview.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Self Review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
