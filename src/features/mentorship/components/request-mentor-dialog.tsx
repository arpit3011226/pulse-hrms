import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRequestMentor } from '../hooks/use-mentorship'
import { personName, type MentorshipPerson } from '../types'
import { toast } from 'sonner'

interface RequestMentorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mentor: MentorshipPerson | null
  myEmployeeId: string
}

/**
 * Ask somebody to be your mentor.
 *
 * The database refuses a request to your own reporting manager, a second
 * request while one is open, and a mentor who is already full. Those messages
 * are written for the person reading them, so they are shown as they come.
 */
export function RequestMentorDialog({
  open, onOpenChange, mentor, myEmployeeId,
}: RequestMentorDialogProps) {
  const requestMentor = useRequestMentor()
  // Mounted only while open, so these are the values every time it opens.
  const [message, setMessage] = useState('')
  const [goal, setGoal] = useState('')

  async function send() {
    if (!mentor) return
    try {
      await requestMentor.mutateAsync({
        mentee_id: myEmployeeId,
        mentor_id: mentor.id,
        message: message.trim(),
        goal_summary: goal.trim(),
      })
      toast.success('Request sent')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send the request')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle>Ask {personName(mentor)} to be your mentor</DialogTitle>
          <DialogDescription>
            They will see this and can accept or decline. You can have one request open at a time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="req-goal">What do you want to get better at?</Label>
          <Textarea
            id="req-goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
            placeholder="e.g. Running a project end to end, and getting more confident with clients."
          />
          <p className="text-xs text-muted-foreground">
            If they accept, this is where your agreed objective starts from.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="req-message">Why them?</Label>
          <Textarea
            id="req-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="A line or two on why you are asking this person."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={!goal.trim() || requestMentor.isPending}>
            {requestMentor.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
