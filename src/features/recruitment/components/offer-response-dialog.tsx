import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, ThumbsDown, ThumbsUp } from 'lucide-react'
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
import { useAuth } from '@/features/auth/hooks/use-auth'
import { getCurrentEmployee } from '@/features/attendance/api/attendance.api'
import { useRecordOfferResponse, useReviseOffer } from '../hooks/use-recruitment'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

const DECLINE_REASONS = [
  'Accepted another offer',
  'Compensation below expectation',
  'Role not a fit',
  'Location or commute',
  'Counter-offer from current employer',
  'Personal reasons',
  'No response',
  'Other',
]

interface OfferRow {
  id: string
  organization_id: string
  candidate_application_id: string
  offered_designation?: string | null
  offered_ctc?: number | null
  joining_date?: string | null
  valid_until?: string | null
  version?: number | null
  candidate_application?: {
    candidate?: { first_name: string; last_name: string } | null
  } | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  offer: OfferRow | null
  mode: 'respond' | 'revise'
}

export function OfferResponseDialog({ open, onOpenChange, offer, mode }: Props) {
  const { profile } = useAuth()
  const { data: me } = useQuery({
    queryKey: ['current-employee', profile?.id],
    queryFn: () => getCurrentEmployee(profile!.id),
    enabled: !!profile?.id,
  })
  const recordResponse = useRecordOfferResponse()
  const reviseOffer = useReviseOffer()

  const [declineReason, setDeclineReason] = useState('')
  const [remarks, setRemarks] = useState('')
  const [newCtc, setNewCtc] = useState('')
  const [newJoining, setNewJoining] = useState('')
  const [revisionReason, setRevisionReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !offer) return
    setDeclineReason(''); setRemarks(''); setRevisionReason('')
    setNewCtc(offer.offered_ctc != null ? String(offer.offered_ctc) : '')
    setNewJoining(offer.joining_date ?? '')
  }, [open, offer])

  const name = offer?.candidate_application?.candidate
    ? `${offer.candidate_application.candidate.first_name} ${offer.candidate_application.candidate.last_name}`
    : 'the candidate'

  async function respond(response: 'accepted' | 'rejected') {
    if (!offer) return
    setSaving(true)
    try {
      await recordResponse.mutateAsync({
        id: offer.id,
        response,
        remarks: remarks.trim() || null,
        declineReason: declineReason || null,
      })
      toast.success(response === 'accepted' ? 'Offer accepted' : 'Offer declined')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not record the response')
    } finally {
      setSaving(false)
    }
  }

  async function revise() {
    if (!offer) return
    setSaving(true)
    try {
      await reviseOffer.mutateAsync({
        previous: offer,
        offeredCtc: Number(newCtc),
        joiningDate: newJoining,
        revisionReason: revisionReason.trim(),
        createdBy: me?.id ?? null,
      })
      toast.success('Revised offer created as a draft')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not revise the offer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'respond' ? 'Record candidate response' : 'Revise offer'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'respond'
              ? `What did ${name} come back with?`
              : `The current offer is withdrawn and a new version is created, so the negotiation history is kept.`}
          </DialogDescription>
        </DialogHeader>

        {mode === 'respond' ? (
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>If declining, why?</Label>
              <Select value={declineReason} onValueChange={setDeclineReason}>
                <SelectTrigger><SelectValue placeholder="Only needed when declining" /></SelectTrigger>
                <SelectContent>
                  {DECLINE_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Worth capturing — it is the only way to spot a pattern in lost offers.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Textarea
                placeholder="Anything they said worth recording"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 py-2">
            {offer?.offered_ctc != null && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <span className="text-muted-foreground">Current offer </span>
                <span className="font-medium">{formatCurrency(offer.offered_ctc)}</span>
                {offer.version && offer.version > 1 && (
                  <span className="text-muted-foreground"> · version {offer.version}</span>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>New CTC (₹) *</Label>
                <Input type="number" value={newCtc} onChange={(e) => setNewCtc(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Joining date *</Label>
                <Input type="date" value={newJoining} onChange={(e) => setNewJoining(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Why is it being revised? *</Label>
              <Textarea
                placeholder="e.g. Candidate negotiated after a counter-offer"
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {mode === 'respond' ? (
            <>
              <Button
                variant="destructive"
                disabled={saving || !declineReason}
                onClick={() => respond('rejected')}
              >
                <ThumbsDown className="mr-2 h-4 w-4" /> Declined
              </Button>
              <Button disabled={saving} onClick={() => respond('accepted')}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ThumbsUp className="mr-2 h-4 w-4" />}
                Accepted
              </Button>
            </>
          ) : (
            <Button
              onClick={revise}
              disabled={!newCtc || !newJoining || !revisionReason.trim() || saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create revised offer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
