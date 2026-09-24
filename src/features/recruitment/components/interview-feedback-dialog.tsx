import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { INTERVIEW_RECOMMENDATIONS } from '@/lib/constants'
import { useSubmitInterviewFeedback, useInterviewCompetencies, useAddScorecardItems } from '../hooks/use-recruitment'
import type { InterviewWithRelations } from '@/types/database.types'
import { toast } from 'sonner'

const feedbackSchema = z.object({
  rating: z.coerce.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  recommendation: z.string().min(1, 'Recommendation is required'),
  strengths: z.string().optional(),
  areas_for_improvement: z.string().optional(),
  comments: z.string().optional(),
})

type FeedbackFormData = z.output<typeof feedbackSchema>

interface InterviewFeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  interview?: InterviewWithRelations
}

export function InterviewFeedbackDialog({ open, onOpenChange, interview }: InterviewFeedbackDialogProps) {
  const submitFeedback = useSubmitInterviewFeedback()
  // F15 — per-competency ratings, so a panel can be compared rather than
  // producing five unrelated paragraphs
  const { data: competencies } = useInterviewCompetencies()
  const addScorecard = useAddScorecardItems()
  const [scores, setScores] = useState<Record<string, number>>({})

  const existingFeedback = interview?.interview_feedback

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.input<typeof feedbackSchema>, unknown, FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      rating: 3,
      recommendation: '',
      strengths: '',
      areas_for_improvement: '',
      comments: '',
    },
  })

  const recommendation = watch('recommendation')

  useEffect(() => {
    if (existingFeedback) {
      reset({
        rating: existingFeedback.rating ?? 3,
        recommendation: existingFeedback.recommendation || '',
        strengths: existingFeedback.strengths || '',
        areas_for_improvement: existingFeedback.areas_for_improvement || '',
        comments: existingFeedback.comments || '',
      })
    } else {
      reset({
        rating: 3,
        recommendation: '',
        strengths: '',
        areas_for_improvement: '',
        comments: '',
      })
    }
  }, [existingFeedback, reset, open])

  useEffect(() => {
    if (open) setScores({})
  }, [open])

  const onSubmit = async (data: FeedbackFormData) => {
    if (!interview) return
    try {
      const feedback = await submitFeedback.mutateAsync({
        interview_id: interview.id,
        interviewer_id: interview.interviewer_id || '',
        rating: data.rating,
        recommendation: data.recommendation as any,
        strengths: data.strengths || undefined,
        areas_for_improvement: data.areas_for_improvement || undefined,
        comments: data.comments || undefined,
      })

      const rated = Object.entries(scores).filter(([, v]) => v > 0)
      if (rated.length > 0 && feedback?.id) {
        await addScorecard.mutateAsync(
          rated.map(([competency, rating]) => ({
            interview_feedback_id: feedback.id,
            competency,
            rating,
          }))
        )
      }

      toast.success('Feedback submitted successfully')
      onOpenChange(false)
    } catch {
      toast.error('Failed to submit feedback')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existingFeedback ? 'Edit Interview Feedback' : 'Submit Interview Feedback'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rating">Rating (1-5) *</Label>
              <Input
                id="rating"
                type="number"
                min={1}
                max={5}
                step={0.5}
                {...register('rating')}
              />
              {errors.rating && (
                <p className="text-sm text-destructive">{errors.rating.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Recommendation *</Label>
              <Select value={recommendation} onValueChange={(v) => setValue('recommendation', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recommendation" />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_RECOMMENDATIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.recommendation && (
                <p className="text-sm text-destructive">{errors.recommendation.message}</p>
              )}
            </div>
          </div>

          {(competencies ?? []).length > 0 && (
            <div className="space-y-2 rounded-md border p-3">
              <Label>Scorecard</Label>
              <p className="text-xs text-muted-foreground">
                Rate each area from 1 to 5. This is what makes a panel comparable.
              </p>
              <div className="mt-2 space-y-2">
                {(competencies ?? []).map((c) => {
                  const comp = c as { id: string; name: string }
                  const current = scores[comp.name] ?? 0
                  return (
                    <div key={comp.id} className="flex items-center justify-between gap-3">
                      <span className="text-sm">{comp.name}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() =>
                              setScores((prev) => ({ ...prev, [comp.name]: n }))
                            }
                            className={`h-7 w-7 rounded border text-xs transition-colors ${
                              current === n
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'hover:bg-muted'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="strengths">Strengths</Label>
            <Textarea
              id="strengths"
              {...register('strengths')}
              rows={3}
              placeholder="What were the candidate's strengths?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="areas_for_improvement">Areas for Improvement</Label>
            <Textarea
              id="areas_for_improvement"
              {...register('areas_for_improvement')}
              rows={3}
              placeholder="What areas need improvement?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Additional Comments</Label>
            <Textarea
              id="comments"
              {...register('comments')}
              rows={3}
              placeholder="Any other observations..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitFeedback.isPending}>
              {submitFeedback.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {existingFeedback ? 'Update Feedback' : 'Submit Feedback'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
