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
import { Separator } from '@/components/ui/separator'
import { useAcceptRequest, useDeclineRequest } from '../hooks/use-mentorship'
import { one } from '@/lib/supabase-embed'
import {
  FREQUENCY_LABELS, personName,
  type CheckinFrequency, type MentorshipPerson, type MentorshipRequestRow,
} from '../types'
import { toast } from 'sonner'

interface RespondRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: MentorshipRequestRow | null
}

/**
 * Accept or decline being somebody's mentor.
 *
 * Declining asks for a reason and will not go through without one. Being turned
 * down in silence is worse than being turned down, and it is the thing that
 * stops people asking a second time.
 */
export function RespondRequestDialog({
  open, onOpenChange, request,
}: RespondRequestDialogProps) {
  const accept = useAcceptRequest()
  const decline = useDeclineRequest()

  const mentee = one(request?.mentee as unknown) as MentorshipPerson | undefined

  // Mounted fresh for each request, so the objective starts from what that
  // person actually wrote rather than from whoever was read before them.
  const [mode, setMode] = useState<'accept' | 'decline'>('accept')
  const [objective, setObjective] = useState(request?.goal_summary ?? '')
  const [frequency, setFrequency] = useState<CheckinFrequency>('monthly')
  const [reason, setReason] = useState('')

  async function submit() {
    if (!request) return
    try {
      if (mode === 'accept') {
        await accept.mutateAsync({
          request_id: request.id,
          objective: objective.trim(),
          frequency,
          mentee_id: request.mentee_id,
        })
        toast.success('You are now mentoring them')
      } else {
        await decline.mutateAsync({
          request_id: request.id,
          reason: reason.trim(),
          mentee_id: request.mentee_id,
        })
        toast.success('Request declined')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save your answer')
    }
  }

  const busy = accept.isPending || decline.isPending
  const canSubmit = mode === 'accept' ? objective.trim().length > 0 : reason.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle>{personName(mentee)} has asked you to mentor them</DialogTitle>
          <DialogDescription>
            Have a read, then accept or decline. Either answer is fine — declining with an honest
            reason is far better than leaving them waiting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
          {request?.goal_summary && (
            <div>
              <p className="text-xs text-muted-foreground">What they want to get better at</p>
              <p className="whitespace-pre-wrap pt-1 text-sm">{request.goal_summary}</p>
            </div>
          )}
          {request?.message && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Why they asked you</p>
                <p className="whitespace-pre-wrap pt-1 text-sm">{request.message}</p>
              </div>
            </>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Your answer</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as 'accept' | 'decline')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="accept">Accept — I will mentor them</SelectItem>
              <SelectItem value="decline">Decline</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {mode === 'accept' ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="objective">What will you work on together?</Label>
              <Textarea
                id="objective"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={4}
                placeholder="Agree something specific enough to know whether you got there."
              />
              <p className="text-xs text-muted-foreground">
                Started from what they wrote. Change it to what you have both settled on — either
                of you can edit it later.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>How often will you meet?</Label>
              <Select
                value={frequency}
                onValueChange={(v) => setFrequency(v as CheckinFrequency)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(FREQUENCY_LABELS) as CheckinFrequency[]).map((k) => (
                    <SelectItem key={k} value={k}>{FREQUENCY_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used to work out when your next check-in is due. You can change it any time.
              </p>
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="decline-reason">Why are you declining?</Label>
            <Textarea
              id="decline-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="e.g. I am stretched this quarter, but do ask me again after March."
            />
            <p className="text-xs text-muted-foreground">
              They will see this. A straight reason helps them ask the right person next.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!canSubmit || busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'accept' ? 'Accept and start' : 'Send decline'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
