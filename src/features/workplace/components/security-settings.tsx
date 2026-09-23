import { useEffect, useState } from 'react'
import { KeyRound, Loader2, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/use-permissions'
import { toast } from 'sonner'

/**
 * F54 — two-factor authentication.
 *
 * Strongly recommended for HR, payroll and admin roles: those accounts can see
 * every salary in the company. Uses Supabase's own TOTP enrolment, so the
 * secret never passes through our code.
 */
interface Factor {
  id: string
  friendly_name?: string
  status: string
}

export function SecuritySettings() {
  const { isAdmin, isHR, isPayrollAdmin } = usePermissions()
  const isSensitiveRole = isAdmin || isHR || isPayrollAdmin

  const [factors, setFactors] = useState<Factor[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolOpen, setEnrolOpen] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error
      setFactors((data?.totp ?? []) as unknown as Factor[])
    } catch {
      setFactors([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const verified = factors.filter((f) => f.status === 'verified')

  async function startEnrol() {
    setBusy(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Authenticator ${new Date().toLocaleDateString('en-IN')}`,
      })
      if (error) throw error
      setFactorId(data.id)
      setQr(data.totp?.qr_code ?? null)
      setSecret(data.totp?.secret ?? null)
      setCode('')
      setEnrolOpen(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start enrolment')
    } finally {
      setBusy(false)
    }
  }

  async function verify() {
    if (!factorId) return
    setBusy(true)
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId })
      if (cErr) throw cErr
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim(),
      })
      if (vErr) throw vErr
      toast.success('Two-factor authentication is on')
      setEnrolOpen(false)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That code was not accepted')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setBusy(true)
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: id })
      if (error) throw error
      toast.success('Two-factor authentication removed')
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove it')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {isSensitiveRole && verified.length === 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-start gap-3 py-4">
            <ShieldOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm">
              Your role can see every salary in the company. Turning on two-factor authentication is
              strongly recommended.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" /> Two-factor authentication
          </CardTitle>
          <CardDescription>
            An app on your phone generates a six-digit code that is asked for alongside your
            password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking…
            </p>
          ) : verified.length === 0 ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Not set up.</p>
              <Button onClick={startEnrol} disabled={busy}>
                <Smartphone className="mr-2 h-4 w-4" /> Set up
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {verified.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm">{f.friendly_name ?? 'Authenticator app'}</span>
                    <Badge className="bg-emerald-100 text-emerald-800">On</Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive" disabled={busy}
                    onClick={() => remove(f.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={enrolOpen} onOpenChange={setEnrolOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set up two-factor</DialogTitle>
            <DialogDescription>
              Scan this with Google Authenticator, Authy or any similar app, then type the code it
              shows.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {qr && (
              <div className="flex justify-center rounded-md border bg-white p-3">
                <img src={qr} alt="Two-factor QR code" className="h-44 w-44" />
              </div>
            )}
            {secret && (
              <div className="space-y-1">
                <Label className="text-xs">Or enter this key by hand</Label>
                <code className="block break-all rounded bg-muted p-2 text-xs">{secret}</code>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Six-digit code *</Label>
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrolOpen(false)}>Cancel</Button>
            <Button onClick={verify} disabled={code.length !== 6 || busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Turn on
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
