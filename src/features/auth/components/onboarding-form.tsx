import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from '@tanstack/react-router'
import { Building2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../hooks/use-auth'
import { slugify } from '@/lib/utils'

const onboardingSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  industry: z.string().min(1, 'Please select an industry'),
  employeeCount: z.string().min(1, 'Please select company size'),
})

type OnboardingFormData = z.infer<typeof onboardingSchema>

const industries = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing',
  'Retail', 'Services', 'Media', 'Real Estate', 'Other',
]

const employeeCounts = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '500+', label: '500+ employees' },
]

export function OnboardingForm() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
  })

  const onSubmit = async (data: OnboardingFormData) => {
    if (!user) return

    try {
      setError(null)

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: data.companyName,
          slug: slugify(data.companyName),
          industry: data.industry,
          employee_count_range: data.employeeCount,
        })
        .select()
        .single()

      if (orgError) throw orgError

      // Update profile with organization and super_admin role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_id: org.id,
          role: 'super_admin',
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Create employee record for the admin
      const profile = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single()

      if (profile.data) {
        await supabase.from('employees').insert({
          organization_id: org.id,
          profile_id: user.id,
          first_name: profile.data.first_name || '',
          last_name: profile.data.last_name || '',
          email: profile.data.email,
          employee_code: 'EMP001',
          employment_type: 'full_time',
          status: 'active',
          date_of_joining: new Date().toISOString().split('T')[0],
        })
      }

      await refreshProfile()
      navigate({ to: '/dashboard' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization')
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Building2 className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-2xl">Set up your organization</CardTitle>
        <CardDescription>
          Tell us about your company to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              placeholder="Acme Inc."
              {...register('companyName')}
            />
            {errors.companyName && (
              <p className="text-sm text-destructive">{errors.companyName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Industry</Label>
            <Select onValueChange={(value) => setValue('industry', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((industry) => (
                  <SelectItem key={industry} value={industry.toLowerCase()}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.industry && (
              <p className="text-sm text-destructive">{errors.industry.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Company size</Label>
            <Select onValueChange={(value) => setValue('employeeCount', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select company size" />
              </SelectTrigger>
              <SelectContent>
                {employeeCounts.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employeeCount && (
              <p className="text-sm text-destructive">{errors.employeeCount.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue to Dashboard
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
