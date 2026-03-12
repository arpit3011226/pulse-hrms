import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setError(null)
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We've sent you a password reset link. Please check your email.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link to="/login" className="text-sm text-primary hover:underline">
            <ArrowLeft className="mr-1 inline h-4 w-4" />
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Forgot password?</CardTitle>
        <CardDescription>
          Enter your email and we'll send you a reset link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="name@company.com" {...register('email')} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reset Link
          </Button>
        </form>
        <div className="mt-4 text-center">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="mr-1 inline h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
