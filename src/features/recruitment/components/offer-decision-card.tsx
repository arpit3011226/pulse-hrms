import { useState } from 'react'
import {
  AlertTriangle, CheckCircle2, Clock, FileText, Loader2, ShieldCheck, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { companyName } from '@/lib/document-branding'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useRespondToOffer } from '../hooks/use-preboarding'
import type { OfferTerms } from '../api/offer-response.api'

interface OfferRow {
  id: string
  offered_designation: string | null
  offered_ctc: number | null
  joining_date: string | null
  valid_until: string | null
  offer_status: string
  accepted_name: string | null
  accepted_at: string | null
  decline_reason: string | null
}

const CONSENT =
  'I have read the terms above and I accept this offer of employment.'

/**
 * A candidate answering their own offer.
 *
 * Before this the portal showed the terms and said "get back to your
 * recruiter", and HR typed in what they heard — so the record of the most
 * important agreement in the whole hiring process was somebody else's note
 * that a phone call had happened.
 *
 * Same shape as signing an agreement, for the same reason: the terms as
 * shown are frozen and hashed at the moment of the answer. A revised offer
 * changes the CTC, and without that frozen copy there would be nothing
 * showing which figure was actually agreed to.
 */
export function OfferDecisionCard({
  offer,
  candidateName,
}: {
  offer: OfferRow
  candidateName: string
}) {
  const { organization } = useAuth()
  const respond = useRespondToOffer()

  const [mode, setMode] = useState<'accept' | 'decline' | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [typedName, setTypedName] = useState('')
  const [reason, setReason] = useState('')

  const answered = offer.offer_status === 'accepted' || offer.offer_status === 'rejected'
  const expired =
    !!offer.valid_until && !answered && new Date(offer.valid_until) < new Date()

  const terms: OfferTerms = {
    offered_designation: offer.offered_designation,
    offered_ctc: offer.offered_ctc,
    joining_date: offer.joining_date,
    valid_until: offer.valid_until,
    company_name: companyName(organization),
  }

  // Must match the name on record, or a signature block reading anything at
  // all would be worth nothing. Case and spacing are forgiven; the name is not.
  const normalise = (v: string) => v.trim().toLowerCase().replace(/\s+/g, ' ')
  const nameMatches = normalise(typedName) === normalise(candidateName)

  async function submit(response: 'accepted' | 'rejected') {
    try {
      await respond.mutateAsync({
        offer_id: offer.id,
        response,
        typed_name: response === 'accepted' ? typedName.trim() : candidateName,
        terms,
        decline_reason: response === 'rejected' ? reason.trim() || null : null,
      })
      toast.success(
        response === 'accepted'
          ? 'Offer accepted. Welcome aboard.'
          : 'Thank you for letting us know.'
      )
      setMode(null)
      setAgreed(false)
      setTypedName('')
      setReason('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That did not go through. Please try again.')
    }
  }

  return (
    <>
      <Card
        className={
          offer.offer_status === 'accepted'
            ? 'border-emerald-200 bg-emerald-50/40'
            : offer.offer_status === 'rejected'
            ? 'border-gray-200'
            : 'border-primary/30 bg-primary/[0.03]'
        }
      >
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Your offer
            </CardTitle>
            {offer.offer_status === 'accepted' && (
              <Badge className="bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Accepted
              </Badge>
            )}
            {offer.offer_status === 'rejected' && (
              <Badge className="bg-gray-100 text-gray-700">Declined</Badge>
            )}
            {expired && (
              <Badge className="bg-amber-100 text-amber-800">
                <Clock className="mr-1 h-3 w-3" /> Past its date
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Position</dt>
            <dd className="text-right font-medium">{offer.offered_designation ?? '—'}</dd>
            <dt className="text-muted-foreground">Annual CTC</dt>
            <dd className="text-right font-medium">
              {offer.offered_ctc != null ? formatCurrency(offer.offered_ctc) : '—'}
            </dd>
            <dt className="text-muted-foreground">Joining date</dt>
            <dd className="text-right font-medium">
              {offer.joining_date ? formatDate(offer.joining_date) : '—'}
            </dd>
            {offer.valid_until && (
              <>
                <dt className="text-muted-foreground">Please reply by</dt>
                <dd className="text-right font-medium">{formatDate(offer.valid_until)}</dd>
              </>
            )}
          </dl>

          {offer.offer_status === 'accepted' ? (
            <div className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
              <p className="font-medium">You accepted this offer.</p>
              <p className="mt-0.5 text-xs">
                Signed as {offer.accepted_name}
                {offer.accepted_at ? ` on ${formatDate(offer.accepted_at)}` : ''}. We will be in
                touch about joining, and about the documents we need before your first day.
              </p>
            </div>
          ) : offer.offer_status === 'rejected' ? (
            <div className="mt-4 rounded-md bg-muted p-3 text-sm">
              <p className="font-medium">You declined this offer.</p>
              {offer.decline_reason && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  You told us: {offer.decline_reason}
                </p>
              )}
            </div>
          ) : (
            <>
              {expired && (
                <p className="mt-3 flex items-start gap-1.5 rounded-md bg-amber-50 p-2.5 text-xs text-amber-900">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  The date on this offer has passed. You can still answer — please talk to your
                  recruiter as well, so they know where things stand.
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => setMode('accept')}>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Accept this offer
                </Button>
                <Button variant="outline" onClick={() => setMode('decline')}>
                  <XCircle className="mr-1.5 h-4 w-4" /> Decline
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Accept */}
      <Dialog open={mode === 'accept'} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept your offer</DialogTitle>
            <DialogDescription>
              Please check the terms once more. Accepting is a commitment, the same as signing
              on paper.
            </DialogDescription>
          </DialogHeader>

          <dl className="grid grid-cols-2 gap-y-1.5 rounded-md border p-3 text-sm">
            <dt className="text-muted-foreground">Position</dt>
            <dd className="text-right font-medium">{offer.offered_designation ?? '—'}</dd>
            <dt className="text-muted-foreground">Annual CTC</dt>
            <dd className="text-right font-medium">
              {offer.offered_ctc != null ? formatCurrency(offer.offered_ctc) : '—'}
            </dd>
            <dt className="text-muted-foreground">Joining date</dt>
            <dd className="text-right font-medium">
              {offer.joining_date ? formatDate(offer.joining_date) : '—'}
            </dd>
          </dl>

          <div className="space-y-3 rounded-md bg-muted/50 p-3">
            <div className="flex items-start gap-2">
              <Checkbox
                id="offer-consent"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="offer-consent" className="text-sm font-normal leading-snug">
                {CONSENT}
              </Label>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Type your full name to accept</Label>
              <Input
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={candidateName}
                autoComplete="off"
              />
              {typedName.trim() && !nameMatches && (
                <p className="flex items-center gap-1.5 text-xs text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  This needs to match your name on record: {candidateName}
                </p>
              )}
            </div>

            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              We record your name, the date and time, and a fingerprint of these exact terms, so
              there is never a question later about what was agreed.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>
              Not yet
            </Button>
            <Button
              disabled={!agreed || !nameMatches || respond.isPending}
              onClick={() => submit('accepted')}
            >
              {respond.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline */}
      <Dialog open={mode === 'decline'} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this offer</DialogTitle>
            <DialogDescription>
              That is entirely your choice, and it will not count against you if you apply again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Would you mind telling us why? (optional)</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="For example: accepted another role, the salary, the location, the timing."
            />
            <p className="text-xs text-muted-foreground">
              Only the hiring team sees this. It genuinely helps us make better offers.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={respond.isPending}
              onClick={() => submit('rejected')}
            >
              {respond.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Decline the offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
