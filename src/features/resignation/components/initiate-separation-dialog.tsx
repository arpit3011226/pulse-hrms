import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CalendarDays, Info } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useFlagAssetsForReturn } from '@/features/assets/hooks/use-assets'
import { usePermissions } from '@/hooks/use-permissions'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import { useSubmitResignation } from '../hooks/use-resignation'
import { EXIT_TYPES } from '@/lib/constants'
import { toast } from 'sonner'

const separationSchema = z.object({
  employee_id: z.string().min(1, 'Please select an employee'),
  exit_type: z.enum(['resignation', 'termination', 'retirement', 'absconding', 'contract_end', 'mutual_separation']),
  resignation_date: z.string().min(1, 'Date is required'),
  exit_reason: z.string().min(10, 'Please provide at least 10 characters'),
  notice_period_days: z.coerce.number().min(0),
})

type SeparationFormData = z.output<typeof separationSchema>

interface InitiateSeparationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InitiateSeparationDialog({ open, onOpenChange }: InitiateSeparationDialogProps) {
  const { profile, organization } = useAuth()
  const { isManager, isHR, isAdmin } = usePermissions()
  const submitResignation = useSubmitResignation()
  // F29 — mark everything they hold as awaiting return, so exit clearance can
  // see it rather than discovering a missing laptop on the last day.
  const flagAssets = useFlagAssetsForReturn()
  const { data: allEmployees } = useEmployees()

  const noticeDays = (organization?.settings as { default_notice_days?: number } | undefined)?.default_notice_days ?? 30

  // Filter exit types — exclude 'resignation' since that's employee-initiated
  const adminExitTypes = EXIT_TYPES.filter((t) => t.value !== 'resignation')

  // Filter employees based on role:
  // Manager sees only direct reports, HR/Admin/Leadership sees all active employees
  const employees = useMemo(() => {
    if (!allEmployees) return []
    const active = allEmployees.filter((e) => e.status === 'active')
    if (isHR || isAdmin) return active
    // Manager: only direct reports
    if (isManager) {
      const myEmployeeRecord = allEmployees.find((e) => e.profile_id === profile?.id)
      if (myEmployeeRecord) {
        return active.filter((e) => e.reporting_manager_id === myEmployeeRecord.id)
      }
    }
    return active
  }, [allEmployees, isHR, isAdmin, isManager, profile?.id])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof separationSchema>, unknown, SeparationFormData>({
    resolver: zodResolver(separationSchema),
    defaultValues: {
      resignation_date: new Date().toISOString().split('T')[0],
      exit_reason: '',
      notice_period_days: noticeDays,
    },
  })

  const resignationDate = watch('resignation_date')
  const noticePeriod = watch('notice_period_days')

  const lastWorkingDate = useMemo(() => {
    if (!resignationDate) return ''
    const d = new Date(resignationDate)
    d.setDate(d.getDate() + Number(noticePeriod || 0))
    return d.toISOString().split('T')[0]
  }, [resignationDate, noticePeriod])

  useEffect(() => {
    if (open) {
      reset({
        employee_id: '',
        exit_type: undefined,
        resignation_date: new Date().toISOString().split('T')[0],
        exit_reason: '',
        notice_period_days: noticeDays,
      })
    }
  }, [open, reset, noticeDays])

  const onSubmit = async (data: SeparationFormData) => {
    if (!organization || !profile) return

    try {
      await submitResignation.mutateAsync({
        organization_id: organization.id,
        employee_id: data.employee_id,
        resignation_date: data.resignation_date,
        exit_reason: data.exit_reason,
        notice_period_days: Number(data.notice_period_days),
        last_working_date: lastWorkingDate,
        initiated_by: profile.id,
        exit_type: data.exit_type,
      })
      try {
        await flagAssets.mutateAsync(data.employee_id)
      } catch {
        // Not fatal — the separation is recorded either way, and assets can be
        // flagged by hand from the Assets screen.
      }

      toast.success('Separation initiated successfully')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to initiate separation')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle>Initiate Separation</DialogTitle>
          <DialogDescription>
            Initiate a separation process on behalf of an employee. This will go through the standard approval workflow.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Employee *</Label>
            <Select onValueChange={(v) => setValue('employee_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employee_id && <p className="text-sm text-destructive">{errors.employee_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Exit Type *</Label>
            <Select onValueChange={(v) => setValue('exit_type', v as SeparationFormData['exit_type'])}>
              <SelectTrigger>
                <SelectValue placeholder="Select exit type" />
              </SelectTrigger>
              <SelectContent>
                {adminExitTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.exit_type && <p className="text-sm text-destructive">{errors.exit_type.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sep_date">Separation Date *</Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="sep_date"
                  type="date"
                  className="pl-9"
                  {...register('resignation_date')}
                />
              </div>
              {errors.resignation_date && <p className="text-sm text-destructive">{errors.resignation_date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notice_days">Notice Period (days)</Label>
              <Input
                id="notice_days"
                type="number"
                {...register('notice_period_days')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sep_reason">Reason *</Label>
            <Textarea
              id="sep_reason"
              rows={3}
              placeholder="Describe the reason for separation..."
              {...register('exit_reason')}
            />
            {errors.exit_reason && <p className="text-sm text-destructive">{errors.exit_reason.message}</p>}
          </div>

          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="h-4 w-4 text-muted-foreground" />
              Calculated Details
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Notice Period</span>
                <p className="font-medium">{Number(noticePeriod) || 0} days</p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Working Date</span>
                <p className="font-medium">
                  {lastWorkingDate
                    ? new Date(lastWorkingDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '-'}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitResignation.isPending}>
              {submitResignation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Initiate Separation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
