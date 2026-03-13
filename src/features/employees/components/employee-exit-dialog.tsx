import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { EXIT_TYPES } from '@/lib/constants'
import { useCreateExitRecord } from '../hooks/use-employee-lifecycle'
import { useAuth } from '@/features/auth/hooks/use-auth'
import type { Employee } from '@/types/database.types'
import { toast } from 'sonner'

const exitSchema = z.object({
  exit_type: z.string().min(1, 'Exit type is required'),
  resignation_date: z.string().optional(),
  last_working_date: z.string().optional(),
  exit_reason: z.string().optional(),
  notice_period_days: z.number().optional(),
  regretted_attrition: z.boolean().optional(),
})

type ExitFormData = z.infer<typeof exitSchema>

interface EmployeeExitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: Employee
}

export function EmployeeExitDialog({ open, onOpenChange, employee }: EmployeeExitDialogProps) {
  const createExit = useCreateExitRecord()
  const { profile } = useAuth()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<ExitFormData>({
    resolver: zodResolver(exitSchema),
    defaultValues: {
      resignation_date: new Date().toISOString().split('T')[0],
      regretted_attrition: false,
    },
  })

  const exitType = watch('exit_type')

  const onSubmit = async (data: ExitFormData) => {
    try {
      const cleaned = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
      )
      await createExit.mutateAsync({
        ...cleaned,
        employee_id: employee.id,
        initiated_by: profile?.id,
        status: 'initiated',
      })
      toast.success('Exit process initiated')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to initiate exit')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Initiate Exit</DialogTitle>
          <DialogDescription>
            Begin the exit process for {employee.first_name} {employee.last_name}. This will change their status and create an exit record.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Exit Type *</Label>
            <Select onValueChange={(v) => setValue('exit_type', v)}>
              <SelectTrigger><SelectValue placeholder="Select exit type" /></SelectTrigger>
              <SelectContent>
                {EXIT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.exit_type && <p className="text-sm text-destructive">{errors.exit_type.message}</p>}
          </div>

          {(exitType === 'resignation' || exitType === 'mutual_separation') && (
            <div className="space-y-2">
              <Label htmlFor="resignation_date">Resignation Date</Label>
              <Input id="resignation_date" type="date" {...register('resignation_date')} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="last_working_date">Last Working Date</Label>
            <Input id="last_working_date" type="date" {...register('last_working_date')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notice_period_days">Notice Period (Days)</Label>
            <Input id="notice_period_days" type="number" min={0} {...register('notice_period_days', { valueAsNumber: true })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exit_reason">Exit Reason</Label>
            <Textarea id="exit_reason" {...register('exit_reason')} placeholder="Reason for leaving..." />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={watch('regretted_attrition')} onCheckedChange={(v) => setValue('regretted_attrition', v)} />
            <Label>Regretted Attrition</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Initiate Exit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
