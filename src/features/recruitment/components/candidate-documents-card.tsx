import { useRef, useState } from 'react'
import {
  AlertCircle, CheckCircle2, Clock, FileText, Loader2, Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatFileSize } from '@/lib/storage'
import { formatDate } from '@/lib/utils'
import { useMyChecklists, useUploadCandidateDocument } from '../hooks/use-preboarding'
import type { PreboardingChecklist, PreboardingItem } from '../api/preboarding.api'

const GATE_TITLE: Record<string, string> = {
  before_offer: 'Before we can make you an offer',
  before_joining: 'Before your first day',
}

const GATE_BLURB: Record<string, string> = {
  before_offer:
    'These help us confirm who you are and what you do today. Most people have them to hand.',
  before_joining:
    'These come from your present employer, so you will only be able to get them once you have resigned. Send each one as it arrives — there is no need to wait and do them together.',
}

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Not sent yet', className: 'bg-gray-100 text-gray-700' },
  uploaded: { label: 'With us, being checked', className: 'bg-blue-100 text-blue-800' },
  verified: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Needs another look', className: 'bg-rose-100 text-rose-800' },
}

function DocumentRow({
  item,
  candidateId,
}: {
  item: PreboardingItem
  candidateId: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const upload = useUploadCandidateDocument()

  async function onPick(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      await upload.mutateAsync({ item, candidate_id: candidateId, file })
      toast.success(`${item.label} sent`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That did not upload. Please try again.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const status = STATUS[item.status] ?? STATUS.pending
  const done = item.status === 'verified'

  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{item.label}</p>
            {!item.is_mandatory && (
              <Badge variant="outline" className="text-[10px]">
                Optional
              </Badge>
            )}
          </div>
          {item.guidance && (
            <p className="mt-1 text-xs text-muted-foreground">{item.guidance}</p>
          )}

          {item.status === 'rejected' && item.rejection_reason && (
            <div className="mt-2 flex items-start gap-1.5 rounded-md bg-rose-50 p-2 text-xs text-rose-800">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{item.rejection_reason}</span>
            </div>
          )}

          {item.file_name && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span className="truncate">{item.file_name}</span>
              {item.file_size ? <span>· {formatFileSize(item.file_size)}</span> : null}
              {item.uploaded_at ? <span>· sent {formatDate(item.uploaded_at)}</span> : null}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge className={status.className}>{status.label}</Badge>
          {!done && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={(e) => onPick(e.target.files?.[0])}
              />
              <Button
                size="sm"
                variant={item.status === 'pending' ? 'default' : 'outline'}
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                {busy ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                )}
                {item.status === 'pending' ? 'Upload' : 'Replace'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ChecklistBlock({ list }: { list: PreboardingChecklist }) {
  const items = [...(list.items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const mandatory = items.filter((i) => i.is_mandatory)
  const settled = mandatory.filter((i) => i.status === 'verified' || i.status === 'uploaded')
  const allDone = mandatory.length > 0 && settled.length === mandatory.length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {GATE_TITLE[list.gate] ?? 'Documents we need'}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{GATE_BLURB[list.gate]}</p>
          </div>
          <div className="text-right">
            <Badge
              className={
                list.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-800'
                  : allDone
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-amber-100 text-amber-800'
              }
            >
              {list.status === 'approved'
                ? 'All done'
                : `${settled.length} of ${mandatory.length} sent`}
            </Badge>
            {list.due_date && list.status !== 'approved' && (
              <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" /> by {formatDate(list.due_date)}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {list.status === 'approved' ? (
          <div className="flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
            <CheckCircle2 className="h-4 w-4" />
            Everything here has been accepted. Nothing more to do.
          </div>
        ) : null}

        {items.map((item) => (
          <DocumentRow key={item.id} item={item} candidateId={list.candidate_id} />
        ))}

        <p className="pt-1 text-[11px] text-muted-foreground">
          JPG, PNG or PDF, up to 5 MB each. Your files are private — only the HR team can open
          them.
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * What a candidate has been asked to send in, on their own portal.
 *
 * Shows nothing at all when nothing has been asked for, rather than an empty
 * box — a candidate who has not reached that stage should not be left
 * wondering what they have missed.
 */
export function CandidateDocumentsCard({ candidateId }: { candidateId: string | undefined }) {
  const { data, isLoading } = useMyChecklists(!!candidateId)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your documents…
        </CardContent>
      </Card>
    )
  }

  const lists = (data ?? []).filter((l) => (l.items ?? []).length > 0)
  if (lists.length === 0) return null

  return (
    <div className="space-y-6">
      {lists.map((list) => (
        <ChecklistBlock key={list.id} list={list} />
      ))}
    </div>
  )
}
