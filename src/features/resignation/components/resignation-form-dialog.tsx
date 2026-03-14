import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CalendarDays, Info } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useSubmitResignation } from '../hooks/use-resignation'
import { toast } from 'sonner'

const resignationSchema = z.object({
  resignation_date: z.string().min(1, 'Resignation date is required'),
  exit_reason: z.string().min(10, 'Please provide at least 10 characters explaining your reason'),
})

type ResignationFormData = z.infer<typeof resignationSchema>

interface ResignationFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
}

export function ResignationFormDialog({ open, onOpenChange, employeeId }: ResignationFormDialogProps) {
  const { profile, organization } = useAuth()
  const submitResignation = useSubmitResignation()

  const noticeDays = (organization?.settings as { default_notice_days?: number } | undefined)?.default_notice_days ?? 30

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ResignationFormData>({
    resolver: zodResolver(resignationSchema),
    defaultValues: {
      resignation_date: new Date().toISOString().split('T')[0],
      exit_reason: '',
    },
  })

  const resignationDate = watch('resignation_date')

  const lastWorkingDate = (() => {
    if (!resignationDate) return ''
    const d = new Date(resignationDate)
    d.setDate(d.getDate() + noticeDays)
    return d.toISOString().split('T')[0]
  })()

  useEffect(() => {
    if (open) {
      reset({
        resignation_date: new Date().toISOString().split('T')[0],
        exit_reason: '',
      })
    }
  }, [open, reset])

  const onSubmit = async (data: ResignationFormData) => {
    if (!organization || !profile) return

    try {
      await submitResignation.mutateAsync({
        organization_id: organization.id,
        employee_id: employeeId,
        resignation_date: data.resignation_date,
        exit_reason: data.exit_reason,
        notice_period_days: noticeDays,
        last_working_date: lastWorkingDate,
        initiated_by: profile.id,
      })
      toast.success('Resignation submitted successfully')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to submit resignation')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit Resignation</DialogTitle>
          <DialogDescription>
            Please provide the details for your resignation. This will be sent to your manager for approval.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resignation_date">Resignation Date *</Label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="resignation_date"
                type="date"
                className="pl-9"
                {...register('resignation_date')}
              />
            </div>
            {errors.resignation_date && (
              <p className="text-sm text-destructive">{errors.resignation_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="exit_reason">Reason for Resignation *</Label>
            <Textarea
              id="exit_reason"
              rows={4}
              placeholder="Please describe your reason for leaving..."
              {...register('exit_reason')}
            />
            {errors.exit_reason && (
              <p className="text-sm text-destructive">{errors.exit_reason.message}</p>
            )}
          </div>

          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="h-4 w-4 text-muted-foreground" />
              Notice Period Details
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Notice Period</span>
                <p className="font-medium">{noticeDays} days</p>
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
              Submit Resignation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
