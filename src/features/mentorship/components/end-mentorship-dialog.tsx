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
import { useEndMentorship } from '../hooks/use-mentorship'
import type { MentorshipRow } from '../types'
import { toast } from 'sonner'

interface EndMentorshipDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mentorship: MentorshipRow
  /** Whoever is not pressing the button gets told. */
  otherPersonId: string
}

/**
 * Close a mentorship off.
 *
 * Worth having for its own sake, and necessary for the programme to keep
 * working: a mentor carries three people at most, so without a way to finish
 * one, every mentor fills up permanently and nobody new can be taken on.
 */
export function EndMentorshipDialog({
  open, onOpenChange, mentorship, otherPersonId,
}: EndMentorshipDialogProps) {
  const endMentorship = useEndMentorship()
  // Mounted only while open, so these are the values every time it opens.
  const [status, setStatus] = useState<'completed' | 'ended'>('completed')
  const [reason, setReason] = useState('')

  async function save() {
    try {
      await endMentorship.mutateAsync({
        id: mentorship.id,
        status,
        reason: reason.trim(),
        notify_employee_id: otherPersonId,
      })
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
