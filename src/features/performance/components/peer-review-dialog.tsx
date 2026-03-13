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
import { useSubmitPeerReview, usePeerReviews } from '../hooks/use-performance'
import { RATING_SCALE } from '@/lib/constants'

const peerReviewSchema = z.object({
  rating: z.coerce
    .number()
    .min(RATING_SCALE.MIN, `Minimum rating is ${RATING_SCALE.MIN}`)
    .max(RATING_SCALE.MAX, `Maximum rating is ${RATING_SCALE.MAX}`),
  strengths: z.string().optional(),
  areas_for_improvement: z.string().optional(),
  feedback: z.string().optional(),
})

type PeerReviewFormData = z.infer<typeof peerReviewSchema>

interface PeerReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reviewId: string
  peerId: string
}

export function PeerReviewDialog({ open, onOpenChange, reviewId, peerId }: PeerReviewDialogProps) {
  const submitPeerReview = useSubmitPeerReview()
  const { data: peerReviews } = usePeerReviews(reviewId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = (peerReviews || []).find((pr: any) => pr.peer_id === peerId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PeerReviewFormData>({
    resolver: zodResolver(peerReviewSchema) as any,
    defaultValues: {
      rating: existing?.rating ?? undefined,
      strengths: existing?.strengths ?? '',
      areas_for_improvement: existing?.areas_for_improvement ?? '',
      feedback: existing?.feedback ?? '',
    },
  })

  const onSubmit = async (data: PeerReviewFormData) => {
    try {
      await submitPeerReview.mutateAsync({
        performance_review_id: reviewId,
        peer_id: peerId,
        rating: data.rating,
        strengths: data.strengths || null,
        areas_for_improvement: data.areas_for_improvement || null,
        feedback: data.feedback || null,
      })
      toast.success('Peer review submitted')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to submit peer review')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit Peer Review</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rating">Rating * (1.0 - 5.0)</Label>
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
              placeholder="What are their key strengths?"
              {...register('strengths')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="areas_for_improvement">Areas for Improvement</Label>
            <Textarea
              id="areas_for_improvement"
              rows={3}
              placeholder="Where can they improve?"
              {...register('areas_for_improvement')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">Additional Feedback</Label>
            <Textarea
              id="feedback"
              rows={3}
              placeholder="Any other feedback..."
              {...register('feedback')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitPeerReview.isPending}>
              {submitPeerReview.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Peer Review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
