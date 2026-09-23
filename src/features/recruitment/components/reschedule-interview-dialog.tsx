import { useEffect, useState } from 'react'
import { CalendarClock, Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRescheduleInterview } from '../hooks/use-recruitment'
import { toast } from 'sonner'
import type { InterviewWithRelations } from '@/types/database.types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  interview: InterviewWithRelations | null
}

/** F14 — the original is kept and linked to, so a pattern of moves is visible. */
export function RescheduleInterviewDialog({ open, onOpenChange, interview }: Props) {
  const reschedule = useRescheduleInterview()
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !interview) return
    setStart(interview.scheduled_start?.slice(0, 16) ?? '')
    setEnd(interview.scheduled_end?.slice(0, 16) ?? '')
    setReason('')
  }, [open, interview])

  const valid = !!start && !!end && new Date(end) > new Date(start) && !!reason.trim()

  async function submit() {
    if (!interview) return
    setSaving(true)
    try {
      await reschedule.mutateAsync({
        original: {
          id: interview.id,
          organization_id: interview.organization_id,
          candidate_application_id: interview.candidate_application_id,
          interview_stage_id: interview.interview_stage_id ?? null,
          interviewer_id: interview.interviewer_id ?? null,
          mode: interview.mode,
          location_or_link: interview.location_or_link ?? null,
        },
        scheduledStart: new Date(start).toISOString(),
        scheduledEnd: new Date(end).toISOString(),
        reason: reason.trim(),
      })
      toast.success('Interview rescheduled')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reschedule')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" /> Reschedule interview
          </DialogTitle>
          <DialogDescription>
            The existing slot is marked rescheduled and a new one created linked to it, so a run of
            moves stays visible rather than disappearing.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>New start *</Label>
              <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>New end *</Label>
              <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          {start && end && new Date(end) <= new Date(start) && (
            <p className="text-xs text-destructive">The end must be after the start.</p>
          )}
          <div className="space-y-1.5">
            <Label>Why is it moving? *</Label>
            <Textarea
              placeholder="e.g. Panel member unavailable"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!valid || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
