import { useState } from 'react'
import {
  CheckCircle2, ExternalLink, FileText, Loader2, Send, ShieldCheck, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { formatDate } from '@/lib/utils'
import { formatFileSize } from '@/lib/storage'
import {
  useCandidateChecklists, useSendChecklist, useReviewDocument, useApproveChecklist,
} from '../hooks/use-preboarding'
import { getDocumentLink, type PreboardingGate, type PreboardingItem } from '../api/preboarding.api'

const GATES: { gate: PreboardingGate; title: string; blurb: string }[] = [
  {
    gate: 'before_offer',
    title: 'Before the offer',
    blurb: 'Identity, education and what they earn today. Things they can produce straight away.',
  },
  {
    gate: 'before_joining',
    title: 'Before joining',
    blurb:
      'Relieving letter, experience letter, final payslips. None of these exist until they have resigned, so asking earlier only stalls the hire.',
  },
]

const ITEM_STATUS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  uploaded: 'bg-blue-100 text-blue-800',
  verified: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
}

export function PreboardingPanel({
  candidateId,
  applicationId,
}: {
  candidateId: string
  applicationId?: string | null
}) {
  const { profile, organization } = useAuth()
  const { isAdmin, isHR } = usePermissions()
  const canReview = isAdmin || isHR

  const { data: lists, isLoading } = useCandidateChecklists(candidateId)
  const send = useSendChecklist()
  const review = useReviewDocument()
  const approve = useApproveChecklist()

  const [askGate, setAskGate] = useState<PreboardingGate | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [rejecting, setRejecting] = useState<PreboardingItem | null>(null)
  const [reason, setReason] = useState('')

  async function openDocument(item: PreboardingItem) {
    const url = await getDocumentLink(item)
    if (!url) {
      toast.error('That file could not be opened. It may have been removed.')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function handleSend() {
    if (!askGate || !organization?.id) return
    try {
      await send.mutateAsync({
        organization_id: organization.id,
        candidate_id: candidateId,
        candidate_application_id: applicationId ?? null,
        gate: askGate,
        due_date: dueDate || null,
      })
      toast.success('Asked for. They will see it on their portal.')
      setAskGate(null)
      setDueDate('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send the list')
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading documents…
        </CardContent>
      </Card>
    )
  }

  const byGate = new Map((lists ?? []).map((l) => [l.gate, l]))

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Documents</CardTitle>
          <p className="text-xs text-muted-foreground">
            Asked for in two stages, so an offer is never held up waiting for a letter the
            candidate cannot get yet.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {GATES.map(({ gate, title, blurb }) => {
            const list = byGate.get(gate)
            const items = [...(list?.items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
            const mandatory = items.filter((i) => i.is_mandatory)
            const verified = mandatory.filter((i) => i.status === 'verified')
            const waiting = items.filter((i) => i.status === 'uploaded')

            return (
              <div key={gate} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{title}</p>
                      {list && (
                        <Badge variant="outline" className="capitalize">
                          {list.status.replace('_', ' ')}
                        </Badge>
                      )}
                      {waiting.length > 0 && (
                        <Badge className="bg-blue-100 text-blue-800">
                          {waiting.length} to check
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{blurb}</p>
                  </div>
                  {!list ? (
                    <Button size="sm" variant="outline" onClick={() => setAskGate(gate)}>
                      <Send className="mr-1.5 h-3.5 w-3.5" /> Ask for these
                    </Button>
                  ) : (
                    <div className="text-right text-xs text-muted-foreground">
                      {verified.length} of {mandatory.length} accepted
                      {list.due_date ? <div>by {formatDate(list.due_date)}</div> : null}
                    </div>
                  )}
                </div>

                {items.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">
                            {item.label}
                            {!item.is_mandatory && (
                              <span className="ml-1.5 font-normal text-muted-foreground">
                                (optional)
                              </span>
                            )}
                          </p>
                          {item.file_name && (
                            <p className="truncate text-[11px] text-muted-foreground">
                              {item.file_name}
                              {item.file_size ? ` · ${formatFileSize(item.file_size)}` : ''}
                            </p>
                          )}
                          {item.status === 'rejected' && item.rejection_reason && (
                            <p className="text-[11px] text-rose-700">{item.rejection_reason}</p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <Badge className={ITEM_STATUS[item.status]}>{item.status}</Badge>
                          {item.storage_path && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDocument(item)}
                              title="Open the file"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </Button>
                          )}
                          {canReview && item.status === 'uploaded' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-emerald-700"
                                onClick={async () => {
                                  try {
                                    await review.mutateAsync({
                                      item_id: item.id,
                                      status: 'verified',
                                      reviewer_profile_id: profile!.id,
                                    })
                                    toast.success(`${item.label} accepted`)
                                  } catch (err) {
                                    toast.error(
                                      err instanceof Error ? err.message : 'Could not accept it'
                                    )
                                  }
                                }}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-rose-700"
                                onClick={() => {
                                  setRejecting(item)
                                  setReason('')
                                }}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {canReview && list && list.status !== 'approved' && mandatory.length > 0 &&
                  verified.length === mandatory.length && (
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={async () => {
                        try {
                          await approve.mutateAsync({
                            checklistId: list.id,
                            reviewerProfileId: profile!.id,
                          })
                          toast.success('Signed off')
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Could not sign off')
                        }
                      }}
                    >
                      <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Sign this stage off
                    </Button>
                  )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Ask for a stage */}
      <Dialog open={!!askGate} onOpenChange={(o) => !o && setAskGate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ask for documents</DialogTitle>
            <DialogDescription>
              {askGate === 'before_offer'
                ? 'Identity, education and current salary proof. They can send these today.'
                : 'Relieving letter, experience letter and final payslips. Only ask once the offer has been accepted — these do not exist before they resign.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>By when (optional)</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
            <p className="text-xs text-muted-foreground">
              Shown on their portal as a gentle nudge. Nothing is blocked if the date passes.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAskGate(null)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={send.isPending}>
              {send.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send to candidate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Turn one down */}
      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ask for this one again</DialogTitle>
            <DialogDescription>
              {rejecting ? `${rejecting.label}. They will see your note and can send another.` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>What is wrong with it</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="For example: the number is not readable, or only one side was sent."
            />
            <p className="text-xs text-muted-foreground">
              Say what they need to do differently. "Rejected" on its own helps nobody.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || review.isPending}
              onClick={async () => {
                try {
                  await review.mutateAsync({
                    item_id: rejecting!.id,
                    status: 'rejected',
                    rejection_reason: reason.trim(),
                    reviewer_profile_id: profile!.id,
                  })
                  toast.success('Sent back to them')
                  setRejecting(null)
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Could not send it back')
                }
              }}
            >
              Send it back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
