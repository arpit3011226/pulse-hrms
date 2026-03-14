import { useState, useEffect } from 'react'
import { Loader2, Calendar, Bell, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { usePayrollConfig, useUpdatePayrollConfig } from '../hooks/use-payroll-config'
import { calculateNextPayDate } from '../api/payroll-config.api'
import type { PayrollConfig } from '@/types/database.types'
import { toast } from 'sonner'

const PAY_DAY_OPTIONS = [
  { value: 'last_working_friday', label: 'Last Working Friday' },
  { value: 'fixed_date', label: 'Fixed Date' },
  { value: 'last_day_of_month', label: 'Last Day of Month' },
] as const

const ROLE_OPTIONS = [
  { value: 'payroll_admin', label: 'Payroll Admin' },
  { value: 'hr_admin', label: 'HR Admin' },
  { value: 'super_admin', label: 'Super Admin' },
] as const

export function PayrollConfigPanel() {
  const { data: config, isLoading } = usePayrollConfig()
  const updateConfig = useUpdatePayrollConfig()

  const [form, setForm] = useState<Partial<PayrollConfig>>({})
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (config) {
      setForm({
        pay_day_type: config.pay_day_type,
        fixed_pay_day: config.fixed_pay_day,
        skip_holidays: config.skip_holidays,
        reminder_days_before: config.reminder_days_before,
        reminder_enabled: config.reminder_enabled,
        require_two_level_approval: config.require_two_level_approval,
        first_approver_role: config.first_approver_role,
        second_approver_role: config.second_approver_role,
      })
    }
  }, [config])

  const updateField = <K extends keyof PayrollConfig>(key: K, value: PayrollConfig[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      await updateConfig.mutateAsync(form)
      setHasChanges(false)
      toast.success('Payroll configuration saved')
    } catch {
      toast.error('Failed to save payroll configuration')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Compute next pay date for preview
  const previewConfig: PayrollConfig = {
    ...(config as PayrollConfig),
    ...form,
  } as PayrollConfig
  const nextPayDate = calculateNextPayDate(previewConfig)

  return (
    <div className="space-y-6">
      {/* Pay Day Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Pay Day Settings
          </CardTitle>
          <CardDescription>
            Configure when employees are paid each month
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-sm">
            <Label>Pay Day Type</Label>
            <Select
              value={form.pay_day_type || 'last_working_friday'}
              onValueChange={(v) =>
                updateField('pay_day_type', v as PayrollConfig['pay_day_type'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAY_DAY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.pay_day_type === 'fixed_date' && (
            <div className="space-y-2 max-w-xs">
              <Label>Fixed Pay Day (1-28)</Label>
              <Input
                type="number"
                min={1}
                max={28}
                value={form.fixed_pay_day ?? ''}
                onChange={(e) =>
                  updateField('fixed_pay_day', parseInt(e.target.value) || null)
                }
                placeholder="e.g. 25"
              />
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-4 max-w-sm">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Skip Weekends</Label>
              <p className="text-xs text-muted-foreground">
                Move pay day to previous working day if it falls on a weekend
              </p>
            </div>
            <Switch
              checked={form.skip_holidays ?? true}
              onCheckedChange={(v) => updateField('skip_holidays', v)}
            />
          </div>

          {/* Next pay date preview */}
          <div className="rounded-lg bg-muted/50 p-4 max-w-sm">
            <p className="text-sm text-muted-foreground">Next computed pay date</p>
            <p className="text-lg font-semibold mt-1">
              {nextPayDate.toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Reminder Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Reminder Settings
          </CardTitle>
          <CardDescription>
            Configure payroll processing reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4 max-w-sm">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Enable Reminders</Label>
              <p className="text-xs text-muted-foreground">
                Get notified before payroll processing deadline
              </p>
            </div>
            <Switch
              checked={form.reminder_enabled ?? true}
              onCheckedChange={(v) => updateField('reminder_enabled', v)}
            />
          </div>

          {form.reminder_enabled && (
            <div className="space-y-2 max-w-xs">
              <Label>Days Before Pay Date</Label>
              <Input
                type="number"
                min={1}
                max={15}
                value={form.reminder_days_before ?? 5}
                onChange={(e) =>
                  updateField('reminder_days_before', parseInt(e.target.value) || 5)
                }
              />
              <p className="text-xs text-muted-foreground">
                Reminder will be sent this many days before the pay date
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Approval Workflow
          </CardTitle>
          <CardDescription>
            Configure the payroll approval process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4 max-w-md">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Two-Level Approval</Label>
              <p className="text-xs text-muted-foreground">
                Require two separate approvals before payroll is finalized
              </p>
            </div>
            <Switch
              checked={form.require_two_level_approval ?? true}
              onCheckedChange={(v) => updateField('require_two_level_approval', v)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
            <div className="space-y-2">
              <Label>Level 1 Approver Role</Label>
              <Select
                value={form.first_approver_role || 'payroll_admin'}
                onValueChange={(v) => updateField('first_approver_role', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.require_two_level_approval && (
              <div className="space-y-2">
                <Label>Level 2 Approver Role</Label>
                <Select
                  value={form.second_approver_role || 'hr_admin'}
                  onValueChange={(v) => updateField('second_approver_role', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Workflow preview */}
          <div className="rounded-lg bg-muted/50 p-4 max-w-md">
            <p className="text-sm font-medium mb-2">Approval Flow Preview</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">Submit</Badge>
              <span className="text-muted-foreground">&rarr;</span>
              <Badge variant="secondary">
                L1: {ROLE_OPTIONS.find((r) => r.value === form.first_approver_role)?.label || 'Payroll Admin'}
              </Badge>
              {form.require_two_level_approval && (
                <>
                  <span className="text-muted-foreground">&rarr;</span>
                  <Badge variant="secondary">
                    L2: {ROLE_OPTIONS.find((r) => r.value === form.second_approver_role)?.label || 'HR Admin'}
                  </Badge>
                </>
              )}
              <span className="text-muted-foreground">&rarr;</span>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={updateConfig.isPending || !hasChanges}>
        {updateConfig.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Payroll Settings
      </Button>
    </div>
  )
}
