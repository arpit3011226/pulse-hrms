import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { MONTH_OPTIONS } from '@/lib/constants'
import { useCreatePayrollCycle, useCreatePayrollRun } from '../hooks/use-payroll'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { toast } from 'sonner'

const cycleSchema = z.object({
  payroll_month: z.number().min(1).max(12, 'Month is required'),
  payroll_year: z.number().min(2020).max(2099, 'Enter a valid year'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  pay_date: z.string().optional(),
  notes: z.string().optional(),
})

type CycleFormValues = z.infer<typeof cycleSchema>

interface RunPayrollDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RunPayrollDialog({ open, onOpenChange }: RunPayrollDialogProps) {
  const { organization } = useAuth()
  const createCycle = useCreatePayrollCycle()
  const createRun = useCreatePayrollRun()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CycleFormValues>({
    resolver: zodResolver(cycleSchema) as any,
    defaultValues: {
      payroll_year: new Date().getFullYear(),
    },
  })

  const selectedMonth = watch('payroll_month')

  useEffect(() => {
    if (open) {
      reset({
        payroll_month: undefined as any,
        payroll_year: new Date().getFullYear(),
        start_date: '',
        end_date: '',
        pay_date: '',
        notes: '',
      })
    }
  }, [open, reset])

  const onSubmit = async (data: CycleFormValues) => {
    try {
      const cycle = await createCycle.mutateAsync({
        payroll_month: data.payroll_month,
        payroll_year: data.payroll_year,
        start_date: data.start_date,
        end_date: data.end_date,
        pay_date: data.pay_date || null,
        notes: data.notes || null,
        processing_status: 'draft',
      })

      await createRun.mutateAsync({
        organization_id: organization!.id,
        payroll_cycle_id: cycle.id,
        run_number: 1,
        run_type: 'regular',
        run_status: 'draft',
      })

      toast.success('Payroll cycle created with initial run')
      onOpenChange(false)
    } catch {
      toast.error('Failed to create payroll cycle')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Payroll Cycle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Payroll Month *</Label>
              <Select
                onValueChange={(v) => setValue('payroll_month', parseInt(v))}
                value={selectedMonth ? String(selectedMonth) : undefined}
              >
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
              {errors.payroll_month && (
                <p className="text-sm text-destructive">{errors.payroll_month.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="payroll_year">Payroll Year *</Label>
              <Input
                id="payroll_year"
                type="number"
                {...register('payroll_year', { valueAsNumber: true })}
              />
              {errors.payroll_year && (
                <p className="text-sm text-destructive">{errors.payroll_year.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input id="start_date" type="date" {...register('start_date')} />
              {errors.start_date && (
                <p className="text-sm text-destructive">{errors.start_date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date *</Label>
              <Input id="end_date" type="date" {...register('end_date')} />
              {errors.end_date && (
                <p className="text-sm text-destructive">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay_date">Pay Date</Label>
            <Input id="pay_date" type="date" {...register('pay_date')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" {...register('notes')} placeholder="Optional notes" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || createCycle.isPending || createRun.isPending}>
              {(isSubmitting || createCycle.isPending || createRun.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Cycle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
