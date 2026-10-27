import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { PulseLogo } from '@/components/shared/pulse-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '../hooks/use-auth'
import { config } from '@/lib/config'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

/**
 * Three doors, one lock.
 *
 * The tabs are a signpost, not a gate. Whichever one somebody picks, the
 * sign-in is the same call and the app routes them by the role on their
 * profile — so an employee who used the Candidate tab out of habit still
 * lands on the staff app, and nobody is told they chose wrongly.
 *
 * That is deliberate, and it is the whole reason the tabs are safe.
 *
 * Had a tab REFUSED an address belonging to another group, the screen would
 * have become a way to ask questions about strangers: type an address into
 * the Candidate tab, read the refusal, and you have learnt whether that
 * person works here. A login screen should never answer that.
 *
 * It would also have enforced nothing. These are buttons in a browser. What
 * actually decides who may sign in with what is mayUseGoogle() in the auth
 * provider and the role on the profile, and both run after the fact.
 *
 * So the tabs only change what is OFFERED and what is SAID.
 */

type Door = 'employee' | 'candidate' | 'alumni'

const DOORS: {
  id: Door
  label: string
  blurb: string
  placeholder: string
}[] = [
  {
    id: 'employee',
    label: 'Employee',
    blurb: config.ssoEnabled
      ? 'Use your company Google account.'
      : 'Sign in with your work email address.',
    placeholder: 'name@augustinnovate.com',
  },
  {
    id: 'candidate',
    label: 'Candidate',
    blurb: 'Use the email address you applied with, and the password you set.',
    placeholder: 'you@example.com',
  },
  {
    id: 'alumni',
    label: 'Alumni',
    blurb: 'Use your personal email address — your work account has been closed.',
    placeholder: 'you@example.com',
  },
]

const REMEMBERED = 'pulse.login.door'

export function LoginForm() {
  const { signIn, signInWithGoogle } = useAuth()
  const [error, setError] = useState<string | null>(null)

  // Remembered per browser, so somebody who is always a candidate is not
  // shown the staff door every time. A convenience, and nothing more — it
  // never decides anything.
  const [door, setDoor] = useState<Door>(() => {
    try {
      const saved = localStorage.getItem(REMEMBERED)
      if (saved === 'candidate' || saved === 'alumni' || saved === 'employee') return saved
    } catch {
      // Private browsing, blocked storage. Not worth caring about.
    }
    return 'employee'
  })

  const active = DOORS.find((d) => d.id === door) ?? DOORS[0]
  const showGoogle = config.ssoEnabled && door === 'employee'

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null)
      await signIn(data.email, data.password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    }
  }

  function pick(next: string) {
    setDoor(next as Door)
    setError(null)
    try {
      localStorage.setItem(REMEMBERED, next)
    } catch {
      // Same as above.
    }
  }

  return (
    <Card className="w-full max-w-md border-white/60 bg-white/80 shadow-xl backdrop-blur-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2">
          <PulseLogo size="lg" showText={false} />
        </div>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your Pulse account</CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={door} onValueChange={pick} className="mb-5">
          {/* Employee first: that is who almost everybody signing in is. */}
          <TabsList className="grid w-full grid-cols-3">
            {DOORS.map((d) => (
              <TabsTrigger key={d.id} value={d.id}>
                {d.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <p className="mb-4 text-center text-sm text-muted-foreground">{active.blurb}</p>

        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {showGoogle ? (
          <Button variant="outline" className="w-full" onClick={() => signInWithGoogle()} type="button">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder={active.placeholder} {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter>
        <p className="w-full text-center text-xs text-muted-foreground">
          {door === 'candidate'
            ? 'Your recruiter sets up your login. If you cannot sign in, get in touch with them.'
            : door === 'alumni'
            ? 'Ask HR for a sign-in link if you no longer have your password.'
            : 'Accounts are created by HR. If you cannot sign in, please contact the HR team.'}
        </p>
      </CardFooter>
    </Card>
  )
}
