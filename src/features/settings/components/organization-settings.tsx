import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { TIMEZONE_OPTIONS, CURRENCY_OPTIONS, MONTH_OPTIONS } from '@/lib/constants'

export function OrganizationSettings() {
  const { organization, refreshProfile } = useAuth()
  const { isAdmin } = usePermissions()
  const canEditRegional = isAdmin
  const [isLoading, setIsLoading] = useState(false)
  const [fiscalYear, setFiscalYear] = useState(String(organization?.fiscal_year_start || 4))
  const [timezone, setTimezone] = useState(organization?.timezone || 'Asia/Kolkata')
  const [currency, setCurrency] = useState(organization?.currency || 'INR')

  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: organization?.name || '',
      email: organization?.email || '',
      phone: organization?.phone || '',
      website: organization?.website || '',
    },
  })

  const onSubmit = async (data: Record<string, string>) => {
    if (!organization) return
    setIsLoading(true)
    try {
      const cleaned = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v || null])
      )
      const updateData = canEditRegional
        ? { ...cleaned, fiscal_year_start: Number(fiscalYear), timezone, currency }
        : cleaned
      const { error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', organization.id)

      if (error) throw error
      await refreshProfile()
      toast.success('Organization updated')
    } catch (err) {
      toast.error('Failed to update organization')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Details</CardTitle>
        <CardDescription>Update your company information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="org_name">Company Name</Label>
            <Input id="org_name" {...register('name')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org_email">Company Email</Label>
            <Input id="org_email" type="email" {...register('email')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org_phone">Phone</Label>
            <Input id="org_phone" {...register('phone')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org_website">Website</Label>
            <Input id="org_website" {...register('website')} />
          </div>

          <div className="pt-4 border-t space-y-4">
            <h4 className="text-sm font-medium">Regional Settings</h4>

            {canEditRegional ? (
              <>
                <div className="space-y-2">
                  <Label>Fiscal Year Start</Label>
                  <Select value={fiscalYear} onValueChange={setFiscalYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Fiscal Year Start</Label>
                  <Input
                    value={MONTH_OPTIONS.find((m) => String(m.value) === fiscalYear)?.label || fiscalYear}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input
                    value={TIMEZONE_OPTIONS.find((tz) => tz.value === timezone)?.label || timezone}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input
                    value={CURRENCY_OPTIONS.find((c) => c.value === currency)?.label || currency}
                    disabled
                  />
                </div>
              </>
            )}
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
