import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useEndMentorship, useSaveMentorshipFeedback } from '../hooks/use-mentorship'
import type { MentorshipRow } from '../types'
import { toast } from 'sonner'

interface EndMentorshipDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mentorship: MentorshipRow
  /** Whoever is not pressing the button gets told. */
  otherPersonId: string
  /** The employee closing it, so their feedback is attributed to them. */
  myEmployeeId: string
  /** Which side of the pair they are, so the two views can be read apart. */
  myRole: 'mentee' | 'mentor'
}

/**
 * Close a mentorship off.
 *
 * Worth having for its own sake, and necessary for the programme to keep
 * working: a mentor carries three people at most, so without a way to finish
 * one, every mentor fills up permanently and nobody new can be taken on.
 */
const RATINGS: { value: number; label: string }[] = [
  { value: 5, label: '5 — It changed how I work' },
  { value: 4, label: '4 — Clearly worth the time' },
  { value: 3, label: '3 — Some use' },
  { value: 2, label: '2 — Not much came of it' },
  { value: 1, label: '1 — No use at all' },
]

export function EndMentorshipDialog({
  open, onOpenChange, mentorship, otherPersonId, myEmployeeId, myRole,
}: EndMentorshipDialogProps) {
  const endMentorship = useEndMentorship()
  const saveFeedback = useSaveMentorshipFeedback()
  // Mounted only while open, so these are the values every time it opens.
  const [status, setStatus] = useState<'completed' | 'ended'>('completed')
  const [reason, setReason] = useState('')
  const [rating, setRating] = useState<string>('')
  const [recommend, setRecommend] = useState<string>('')
  const [changed, setChanged] = useState('')

  async function save() {
    try {
      await endMentorship.mutateAsync({
        id: mentorship.id,
        status,
        reason: reason.trim(),
        notify_employee_id: otherPersonId,
      })

      /**
       * Feedback is optional and saved separately. If it fails, the
       * mentorship is still closed — losing a rating is a nuisance, leaving
       * a mentor's place permanently taken is not.
       */
      if (rating) {
        try {
          await saveFeedback.mutateAsync({
            mentorship_id: mentorship.id,
            given_by: myEmployeeId,
            given_as: myRole,
            rating: Number(rating),
            would_recommend: recommend === '' ? null : recommend === 'yes',
            what_changed: changed.trim() || null,
          })
        } catch {
          toast.warning('Closed, but your feedback could not be saved.')
        }
      }

      toast.success(status === 'completed' ? 'Mentorship completed' : 'Mentorship ended')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not close the mentorship')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finish this mentorship</DialogTitle>
          <DialogDescription>
            Both of you keep the record. The mentor frees up a place for somebody else.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>How is it finishing?</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as 'completed' | 'ended')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">
                  Completed — we got what we set out to do
                </SelectItem>
                <SelectItem value="ended">
                  Ended early — it is not going to continue
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="end-reason">A closing note</Label>
            <Textarea
              id="end-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="What came of it, or why it is stopping."
            />
            <p className="text-xs text-muted-foreground">
              The other person can read this, and so can HR.
            </p>
          </div>

          {/*
            HR asked for a way to see whether the programme is worth running.
            One number answers that in aggregate; the rest is optional. Both
            sides answer separately, so neither view is merged into the other.
          */}
          <div className="space-y-3 rounded-md border p-3">
            <div className="space-y-1.5">
              <Label>How useful was this, honestly?</Label>
              <Select value={rating} onValueChange={setRating}>
                <SelectTrigger><SelectValue placeholder="Optional, but it is the only thing we can measure" /></SelectTrigger>
                <SelectContent>
                  {RATINGS.map((r) => (
                    <SelectItem key={r.value} value={String(r.value)}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {rating && (
              <>
                <div className="space-y-1.5">
                  <Label>
                    {myRole === 'mentee'
                      ? 'Would you suggest this mentor to a colleague?'
                      : 'Would you take on another mentee?'}
                  </Label>
                  <Select value={recommend} onValueChange={setRecommend}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="what-changed">What changed?</Label>
                  <Textarea
                    id="what-changed"
                    value={changed}
                    onChange={(e) => setChanged(e.target.value)}
                    rows={3}
                    placeholder="Something you can do now that you could not before, or could not do as well."
                  />
                  <p className="text-xs text-muted-foreground">
                    Only HR sees this one, so you can be blunt.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={endMentorship.isPending}>
            {endMentorship.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {status === 'completed' ? 'Mark as completed' : 'End it'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
