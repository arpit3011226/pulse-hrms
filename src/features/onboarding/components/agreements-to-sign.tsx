import { useEffect, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, Download, FileSignature, Loader2, ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { formatDate } from '@/lib/utils'
import {
  useMyAgreements, useSignAgreement, useMarkAgreementViewed,
} from '../hooks/use-agreements'
import { getAgreementPdfUrl, type EmployeeAgreement } from '../api/agreements.api'

/**
 * What a new joiner has to read and sign, and the copies they keep afterwards.
 *
 * Signing is deliberately a little slow: the whole document is on screen, the
 * consent sentence is shown in full, and they have to type their own name. A
 * one-click "I agree" on a document nobody opened is not worth much if it is
 * ever tested.
 */
export function AgreementsToSign({
  employeeId,
  employeeName,
  employeeCode,
}: {
  employeeId: string | undefined
  employeeName: string
  employeeCode?: string | null
}) {
  const { organization } = useAuth()
  const { data, isLoading } = useMyAgreements(employeeId)
  const sign = useSignAgreement()
  const markViewed = useMarkAgreementViewed()

  const [open, setOpen] = useState<EmployeeAgreement | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [typedName, setTypedName] = useState('')

  useEffect(() => {
    if (open && open.status === 'pending') {
      markViewed.mutate(open.id)
    }
    // Only when the dialog changes — re-running on every render would
    // hammer the table.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open?.id])

  async function download(agreement: EmployeeAgreement) {
    const url = await getAgreementPdfUrl(agreement)
    if (!url) {
      toast.error('That copy could not be found. Please tell HR.')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function handleSign() {
    if (!open || !organization) return
    try {
      await sign.mutateAsync({
        agreement: open,
        typed_name: typedName.trim(),
        organization,
        employee_code: employeeCode,
      })
      toast.success('Signed. Your copy is ready to download.')
      setOpen(null)
      setAgreed(false)
      setTypedName('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That did not go through. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your documents…
        </CardContent>
      </Card>
    )
  }

  const agreements = data ?? []
  if (agreements.length === 0) return null

  const outstanding = agreements.filter((a) => a.status !== 'signed')
  const signed = agreements.filter((a) => a.status === 'signed')

  // The name has to match, otherwise a signature block saying "Mickey Mouse"
  // is worth nothing. Case and extra spaces are forgiven; the name is not.
  const nameMatches =
    typedName.trim().toLowerCase().replace(/\s+/g, ' ') ===
    employeeName.trim().toLowerCase().replace(/\s+/g, ' ')

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSignature className="h-4 w-4" /> Documents to sign
            </CardTitle>
            {outstanding.length > 0 ? (
              <Badge className="bg-amber-100 text-amber-800">
                {outstanding.length} waiting for you
              </Badge>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-800">All signed</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Please read each one before signing. You can download your signed copy at any time,
            including after you leave.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {[...outstanding, ...signed].map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {a.status === 'signed'
                    ? `Signed ${a.signed_at ? formatDate(a.signed_at) : ''}`
                    : a.status === 'viewed'
                    ? 'Opened, not yet signed'
                    : 'Not opened yet'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {a.status === 'signed' ? (
                  <>
                    <Badge className="bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Signed
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => download(a)}>
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Copy
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => setOpen(a)}>
                    Read and sign
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog
        open={!!open}
        onOpenChange={(o) => {
          if (!o) {
            setOpen(null)
            setAgreed(false)
            setTypedName('')
          }
        }}
      >
        <DialogContent size="page">
          <DialogHeader>
            <DialogTitle>{open?.title}</DialogTitle>
            <DialogDescription>
              Read it in full. Signing this is a legal act, the same as signing on paper.
            </DialogDescription>
          </DialogHeader>

          <div
            className="prose prose-sm max-h-[50vh] max-w-none overflow-y-auto rounded-md border bg-white p-4"
            // The text was frozen when this was issued, so it cannot change
            // under the person reading it. It comes from a template HR wrote,
            // not from anything a user typed.
            dangerouslySetInnerHTML={{ __html: open?.rendered_html ?? '' }}
          />

          <div className="space-y-3 rounded-md bg-muted/50 p-3">
            <div className="flex items-start gap-2">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="agree" className="text-sm font-normal leading-snug">
                {open?.consent_statement}
              </Label>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Type your full name to sign</Label>
              <Input
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={employeeName}
                autoComplete="off"
              />
              {typedName.trim() && !nameMatches && (
                <p className="flex items-center gap-1.5 text-xs text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  This needs to match your name on record: {employeeName}
                </p>
              )}
            </div>

            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              We record your name, the date and time, and a fingerprint of this exact text, so
              there is never a question later about what you agreed to.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>
              Not now
            </Button>
            <Button disabled={!agreed || !nameMatches || sign.isPending} onClick={handleSign}>
              {sign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
