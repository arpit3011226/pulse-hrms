import { useState } from 'react'
import { Copy, Eye, EyeOff, KeyRound, Loader2, RefreshCw, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSetLoginPassword } from '@/features/auth/hooks/use-user-admin'

/** Readable, and long enough that nobody is tempted to shorten it. */
function suggestPassword(): string {
  const words = ['monsoon', 'kingfisher', 'sandalwood', 'tamarind', 'jacaranda', 'cardamom', 'banyan', 'marigold']
  const pick = () => words[Math.floor(Math.random() * words.length)]
  const n = Math.floor(Math.random() * 90) + 10
  return `${pick()}-${pick()}-${n}`
}

/**
 * Set a password on any login, for a super admin.
 *
 * Needed because several accounts can never use "Forgot password": the demo
 * logins use a made-up domain, candidates and alumni are often on addresses
 * the company does not control, and somebody who has lost their work email
 * cannot receive a reset. The set-password function was written for exactly
 * this and had no caller until now.
 *
 * Deliberately a little uncomfortable to use. Handing somebody a password is
 * a worse thing than inviting them to choose one, so the normal route stays
 * the link above and this says plainly what it is for.
 */
export function ResetPasswordCard({ canSetForStaff = false }: { canSetForStaff?: boolean }) {
  const setPassword = useSetLoginPassword()
  const [email, setEmail] = useState('')
  const [password, setPasswordValue] = useState('')
  const [show, setShow] = useState(false)
  const [doneFor, setDoneFor] = useState<string | null>(null)

  async function handleSet() {
    const addr = email.trim()
    if (!addr) return
    if (password.length < 12) {
      toast.error('Use at least 12 characters.')
      return
    }
    try {
      await setPassword.mutateAsync({ email: addr, password })
      setDoneFor(addr)
      toast.success('Password set')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not set it')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4" /> Set a password directly
        </CardTitle>
        <CardDescription>
          For logins that can never use "Forgot password" — a candidate or alumnus on an address
          we do not control, a demo account, or somebody who has lost access to their work email.
          Everyone else should get the link above and choose their own.
          {!canSetForStaff && (
            <span className="mt-1.5 block">
              You can do this for <strong>candidates and alumni</strong>. For a member of staff,
              send them a set-password link above, or ask a super admin.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Their sign-in email</Label>
            <Input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setDoneFor(null)
              }}
              placeholder="name@example.com"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label>New password</Label>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <Input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  placeholder="at least 12 characters"
                  autoComplete="new-password"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                variant="outline"
                size="icon"
                title="Suggest one"
                onClick={() => {
                  setPasswordValue(suggestPassword())
                  setShow(true)
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                title="Copy"
                disabled={!password}
                onClick={() => {
                  navigator.clipboard.writeText(password)
                  toast.success('Copied')
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {doneFor && (
          <p className="rounded-md bg-emerald-50 p-2.5 text-sm text-emerald-900">
            Set for <span className="font-medium">{doneFor}</span>. Give it to them in person or
            through something private — not email, which is where the problem started. Ask them to
            change it once they are in.
          </p>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSet} disabled={!email.trim() || !password || setPassword.isPending}>
            {setPassword.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="mr-2 h-4 w-4" />
            )}
            Set password
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
