import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { DEFAULT_ORG_SETTINGS, DAYS_OF_WEEK, DATE_FORMAT_OPTIONS } from '@/lib/constants'
import type { OrganizationSettings } from '@/types/database.types'

const MODULE_INFO = [
  { key: 'leave' as const, label: 'Leave Management', description: 'Track and manage employee leave requests and balances' },
  { key: 'attendance' as const, label: 'Attendance', description: 'Clock in/out tracking and attendance reports' },
  { key: 'payroll' as const, label: 'Payroll', description: 'Salary processing, payslips, and compensation management' },
  { key: 'recruitment' as const, label: 'Recruitment', description: 'Job postings, candidate tracking, and hiring pipeline' },
  { key: 'performance' as const, label: 'Performance', description: 'Performance reviews, goals, and feedback cycles' },
]

function mergeSettings(saved: Partial<OrganizationSettings> | undefined): OrganizationSettings {
  return {
    modules: { ...DEFAULT_ORG_SETTINGS.modules, ...saved?.modules },
    working_days: saved?.working_days ?? DEFAULT_ORG_SETTINGS.working_days,
    date_format: saved?.date_format ?? DEFAULT_ORG_SETTINGS.date_format,
    default_probation_months: saved?.default_probation_months ?? DEFAULT_ORG_SETTINGS.default_probation_months,
    default_notice_days: saved?.default_notice_days ?? DEFAULT_ORG_SETTINGS.default_notice_days,
    week_start_day: saved?.week_start_day ?? DEFAULT_ORG_SETTINGS.week_start_day,
  }
}

export function AdminSettings() {
  const { organization, refreshProfile } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const initial = mergeSettings(organization?.settings as Partial<OrganizationSettings> | undefined)
  const [settings, setSettings] = useState<OrganizationSettings>(initial)

  const toggleModule = (key: keyof OrganizationSettings['modules']) => {
    setSettings((prev) => ({
      ...prev,
      modules: { ...prev.modules, [key]: !prev.modules[key] },
    }))
  }

  const toggleWorkingDay = (day: number) => {
    setSettings((prev) => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter((d) => d !== day)
        : [...prev.working_days, day].sort(),
    }))
  }

  const handleSave = async () => {
    if (!organization) return
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ settings })
        .eq('id', organization.id)

      if (error) throw error
      await refreshProfile()
      toast.success('Admin settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Module Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Module Configuration</CardTitle>
          <CardDescription>Enable or disable modules for your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {MODULE_INFO.map((mod) => (
              <div key={mod.key} className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">{mod.label}</Label>
                  <p className="text-xs text-muted-foreground">{mod.description}</p>
                </div>
                <Switch
                  checked={settings.modules[mod.key]}
                  onCheckedChange={() => toggleModule(mod.key)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Working Days & Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Working Days & Schedule</CardTitle>
          <CardDescription>Configure your organization's work week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Working Days</Label>
            <div className="flex flex-wrap gap-3">
              {DAYS_OF_WEEK.map((day) => (
                <label
                  key={day.value}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer hover:bg-secondary/50 transition-colors"
                >
                  <Checkbox
                    checked={settings.working_days.includes(day.value)}
                    onCheckedChange={() => toggleWorkingDay(day.value)}
                  />
                  <span className="text-sm">{day.short}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2 max-w-xs">
            <Label>Week Starts On</Label>
            <Select
              value={String(settings.week_start_day)}
              onValueChange={(v) => setSettings((prev) => ({ ...prev, week_start_day: Number(v) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sunday</SelectItem>
                <SelectItem value="1">Monday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Default Policies */}
      <Card>
        <CardHeader>
          <CardTitle>Default Policies</CardTitle>
          <CardDescription>Set default values for employee policies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Probation Period (months)</Label>
              <Input
                type="number"
                min={0}
                max={24}
                value={settings.default_probation_months}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, default_probation_months: Number(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Notice Period (days)</Label>
              <Input
                type="number"
                min={0}
                max={180}
                value={settings.default_notice_days}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, default_notice_days: Number(e.target.value) || 0 }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date Format</Label>
            <Select
              value={settings.date_format}
              onValueChange={(v) => setSettings((prev) => ({ ...prev, date_format: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMAT_OPTIONS.map((fmt) => (
                  <SelectItem key={fmt.value} value={fmt.value}>
                    {fmt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Admin Settings
      </Button>
    </div>
  )
}
