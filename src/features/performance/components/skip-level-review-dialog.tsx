import { useEffect, useState } from 'react'
import { Loader2, Star } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCurrentEmployee, useSkipLevelReview, useSubmitSkipLevelReview } from '../hooks/use-performance'
import { toast } from 'sonner'
import type { PerformanceReviewWithRelations } from '@/types/database.types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  review: PerformanceReviewWithRelations | null
}

function RatingPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="rounded p-1 transition-colors hover:bg-muted"
          aria-label={`${n} out of 5`}
        >
          <Star
            className={
              n <= value
                ? 'h-6 w-6 fill-amber-400 text-amber-400'
                : 'h-6 w-6 text-muted-foreground/40'
            }
          />
        </button>
      ))}
      <span className="ml-2 text-sm text-muted-foreground">
        {value > 0 ? `${value} of 5` : 'Not rated'}
      </span>
    </div>
  )
}

export function SkipLevelReviewDialog({ open, onOpenChange, review }: Props) {
  const { data: me } = useCurrentEmployee()
  const { data: existing, isLoading } = useSkipLevelReview(open && review ? review.id : '')
  const submitReview = useSubmitSkipLevelReview()

  const [rating, setRating] = useState(0)
  const [strengths, setStrengths] = useState('')
  const [improvements, setImprovements] = useState('')
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setRating(existing?.rating ?? 0)
    setStrengths(existing?.strengths ?? '')
    setImprovements(existing?.areas_for_improvement ?? '')
    setFeedback(existing?.feedback ?? '')
  }, [open, existing])

  const alreadySubmitted = existing?.status === 'submitted'
  const canSubmit = rating > 0 && !!feedback.trim() && !saving && !alreadySubmitted

  const employeeName = review?.employee
    ? `${review.employee.first_name} ${review.employee.last_name}`
    : 'this employee'

  async function handleSubmit() {
    if (!review) return
    setSaving(true)
    try {
      await submitReview.mutateAsync({
        performance_review_id: review.id,
        skip_level_manager_id: me?.id,
        rating,
        strengths: strengths.trim() || null,
        areas_for_improvement: improvements.trim() || null,
        feedback: feedback.trim(),
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      } as Parameters<typeof submitReview.mutateAsync>[0])
      toast.success('Skip-level review submitted')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit the review')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Skip-level review
            {alreadySubmitted && <Badge variant="secondary">Submitted</Badge>}
          </DialogTitle>
          <DialogDescription>
            Your view of {employeeName} as their manager's manager. This sits alongside the
            manager and peer reviews, not in place of them.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : (
            <div className="grid gap-5 py-2">
              <div className="space-y-2">
                <Label>Overall rating *</Label>
                <RatingPicker value={rating} onChange={alreadySubmitted ? () => {} : setRating} />
              </div>

              <div className="space-y-1.5">
                <Label>What are they doing well?</Label>
                <Textarea
                  placeholder="Strengths you have seen"
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  rows={3}
                  readOnly={alreadySubmitted}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Where could they grow?</Label>
                <Textarea
                  placeholder="Areas to work on"
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                  rows={3}
                  readOnly={alreadySubmitted}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Overall feedback *</Label>
                <Textarea
                  placeholder="Your overall view"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  readOnly={alreadySubmitted}
                />
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {alreadySubmitted ? 'Close' : 'Cancel'}
          </Button>
          {!alreadySubmitted && (
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit review
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
