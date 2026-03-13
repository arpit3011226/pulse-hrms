import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreatePIP, useUpdatePIP, useCurrentEmployee } from '../hooks/use-performance'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import type { PerformanceImprovementPlan } from '@/types/database.types'
import { toast } from 'sonner'

const schema = z.object({
  employee_id: z.string().min(1, 'Employee is required'),
  plan_title: z.string().min(1, 'Plan title is required'),
  objectives: z.string().optional(),
  success_criteria: z.string().optional(),
  support_resources: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  target_end_date: z.string().min(1, 'Target end date is required'),
  progress_notes: z.string().optional(),
  outcome_notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface PipFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pip?: PerformanceImprovementPlan | null
}

export function PipFormDialog({ open, onOpenChange, pip }: PipFormDialogProps) {
  const { organization } = useAuth()
  const createPIP = useCreatePIP()
  const updatePIP = useUpdatePIP()
  const { data: currentEmployee } = useCurrentEmployee()
  const isEditing = !!pip

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_code')
        .eq('organization_id', organization!.id)
        .eq('status', 'active')
      if (error) throw error
      return data
    },
    enabled: !!organization?.id,
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      employee_id: '',
      plan_title: '',
      objectives: '',
      success_criteria: '',
      support_resources: '',
      start_date: '',
      target_end_date: '',
      progress_notes: '',
      outcome_notes: '',
    },
  })

  const selectedEmployeeId = watch('employee_id')

  useEffect(() => {
    if (pip) {
      reset({
        employee_id: pip.employee_id,
        plan_title: pip.plan_title,
        objectives: pip.objectives ?? '',
        success_criteria: pip.success_criteria ?? '',
        support_resources: pip.support_resources ?? '',
        start_date: pip.start_date,
        target_end_date: pip.target_end_date,
        progress_notes: pip.progress_notes ?? '',
        outcome_notes: pip.outcome_notes ?? '',
      })
    } else {
      reset({
        employee_id: '',
        plan_title: '',
        objectives: '',
        success_criteria: '',
        support_resources: '',
        start_date: '',
        target_end_date: '',
        progress_notes: '',
        outcome_notes: '',
      })
    }
  }, [pip, reset])

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing) {
        await updatePIP.mutateAsync({ id: pip.id, ...data } as any)
        toast.success('PIP updated')
      } else {
        await createPIP.mutateAsync({
          ...data,
          initiated_by: currentEmployee?.id ?? null,
          status: 'draft',
        } as any)
        toast.success('PIP created')
      }
      onOpenChange(false)
    } catch {
      toast.error(isEditing ? 'Failed to update PIP' : 'Failed to create PIP')
    }
  }

  const isPending = createPIP.isPending || updatePIP.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit PIP' : 'Create Performance Improvement Plan'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the performance improvement plan details.'
              : 'Create a new performance improvement plan for an employee.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Employee</Label>
            <Select
              value={selectedEmployeeId}
              onValueChange={(value) => setValue('employee_id', value)}
            >
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
            {errors.employee_id && (
              <p className="mt-1 text-xs text-destructive">{errors.employee_id.message}</p>
            )}
          </div>

          <div>
            <Label>Plan Title</Label>
            <Input {...register('plan_title')} placeholder="e.g., Q1 Performance Improvement Plan" />
            {errors.plan_title && (
              <p className="mt-1 text-xs text-destructive">{errors.plan_title.message}</p>
            )}
          </div>

          <div>
            <Label>Objectives</Label>
            <Textarea
              {...register('objectives')}
              placeholder="Outline the key objectives for this plan..."
              rows={3}
            />
          </div>

          <div>
            <Label>Success Criteria</Label>
            <Textarea
              {...register('success_criteria')}
              placeholder="Define measurable criteria for successful completion..."
              rows={3}
            />
          </div>

          <div>
            <Label>Support & Resources</Label>
            <Textarea
              {...register('support_resources')}
              placeholder="List support, training, or resources to be provided..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input type="date" {...register('start_date')} />
              {errors.start_date && (
                <p className="mt-1 text-xs text-destructive">{errors.start_date.message}</p>
              )}
            </div>
            <div>
              <Label>Target End Date</Label>
              <Input type="date" {...register('target_end_date')} />
              {errors.target_end_date && (
                <p className="mt-1 text-xs text-destructive">{errors.target_end_date.message}</p>
              )}
            </div>
          </div>

          {isEditing && (
            <>
              <div>
                <Label>Progress Notes</Label>
                <Textarea
                  {...register('progress_notes')}
                  placeholder="Track progress updates here..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Outcome Notes</Label>
                <Textarea
                  {...register('outcome_notes')}
                  placeholder="Document the final outcome..."
                  rows={3}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
