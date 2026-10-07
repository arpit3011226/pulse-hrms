import { useState } from 'react'
import { Loader2, Lock } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useLogCheckin } from '../hooks/use-mentorship'
import { HEALTH_LABELS, type MentorshipHealth, type MentorshipRow } from '../types'
import { toast } from 'sonner'

interface LogCheckinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mentorship: MentorshipRow
  myEmployeeId: string
}

/**
 * Record that the pair met, and what came of it.
 *
 * The health answer travels upwards — HR and the managers see it — and the
 * notes do not. The screen says which is which, because somebody deciding how
 * frankly to write deserves to know who is reading.
 */
export function LogCheckinDialog({
  open, onOpenChange, mentorship, myEmployeeId,
}: LogCheckinDialogProps) {
  const logCheckin = useLogCheckin()
  const today = new Date().toISOString().slice(0, 10)

  // Mounted only while open, so these are the values every time it opens.
  const [date, setDate] = useState(today)
  const [health, setHealth] = useState<MentorshipHealth>('on_track')
  const [notes, setNotes] = useState('')

  async function save() {
    try {
      await logCheckin.mutateAsync({
        mentorship_id: mentorship.id,
        logged_by: myEmployeeId,
        checkin_date: date,
        health,
        notes: notes.trim() || null,
      })
      toast.success('Check-in recorded')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the check-in')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle>Log a check-in</DialogTitle>
          <DialogDescription>
            A short record of your conversation, so you can both look back on how things have
            moved.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="checkin-date">When did you meet?</Label>
            <Input
              id="checkin-date"
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>How is the mentorship going?</Label>
            <Select value={health} onValueChange={(v) => setHealth(v as MentorshipHealth)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(HEALTH_LABELS) as MentorshipHealth[]).map((k) => (
                  <SelectItem key={k} value={k}>{HEALTH_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              HR and your managers can see this answer, so they know which pairs need help.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="checkin-notes" className="flex items-center gap-1.5">
            What did you talk about?
            <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <Lock className="h-3 w-3" /> only the two of you
            </span>
          </Label>
          <Textarea
            id="checkin-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={8}
            placeholder="What came up, what was decided, what to pick up next time."
          />
          <p className="text-xs text-muted-foreground">
            Nobody outside this mentorship can read this — not HR, not leadership, not your
            manager. Write what is actually useful.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={logCheckin.isPending}>
            {logCheckin.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save check-in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
