import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PERFORMANCE_CYCLE_TYPES } from '@/lib/constants'
import {
  useCreatePerformanceCycle,
  useUpdatePerformanceCycle,
} from '../hooks/use-performance'
import { toast } from 'sonner'
import type { PerformanceCycle } from '@/types/database.types'

const cycleSchema = z.object({
  cycle_name: z.string().min(1, 'Cycle name is required'),
  cycle_code: z.string().min(1, 'Cycle code is required'),
  cycle_type: z.string().min(1, 'Cycle type is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  goal_setting_deadline: z.string().optional().or(z.literal('')),
  self_review_deadline: z.string().optional().or(z.literal('')),
  manager_review_deadline: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
})

type CycleFormData = z.infer<typeof cycleSchema>

interface CycleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cycle?: PerformanceCycle
}

export function CycleFormDialog({ open, onOpenChange, cycle }: CycleFormDialogProps) {
  const isEditing = !!cycle
  const createCycle = useCreatePerformanceCycle()
  const updateCycle = useUpdatePerformanceCycle()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CycleFormData>({
    resolver: zodResolver(cycleSchema) as any,
    defaultValues: {
      cycle_name: '',
      cycle_code: '',
      cycle_type: 'annual',
      start_date: '',
      end_date: '',
      goal_setting_deadline: '',
      self_review_deadline: '',
      manager_review_deadline: '',
      description: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (cycle) {
        reset({
          cycle_name: cycle.cycle_name,
          cycle_code: cycle.cycle_code,
          cycle_type: cycle.cycle_type,
          start_date: cycle.start_date,
          end_date: cycle.end_date,
          goal_setting_deadline: cycle.goal_setting_deadline ?? '',
          self_review_deadline: cycle.self_review_deadline ?? '',
          manager_review_deadline: cycle.manager_review_deadline ?? '',
          description: cycle.description ?? '',
        })
      } else {
        reset({
          cycle_name: '',
          cycle_code: '',
          cycle_type: 'annual',
          start_date: '',
          end_date: '',
          goal_setting_deadline: '',
          self_review_deadline: '',
          manager_review_deadline: '',
          description: '',
        })
      }
    }
  }, [open, cycle, reset])

  const onSubmit = async (data: CycleFormData) => {
    const payload = {
      cycle_name: data.cycle_name,
      cycle_code: data.cycle_code,
      cycle_type: data.cycle_type,
      start_date: data.start_date,
      end_date: data.end_date,
      goal_setting_deadline: data.goal_setting_deadline || null,
      self_review_deadline: data.self_review_deadline || null,
      manager_review_deadline: data.manager_review_deadline || null,
      description: data.description || null,
    }

    try {
      if (isEditing) {
        await updateCycle.mutateAsync({ id: cycle.id, ...payload } as any)
        toast.success('Cycle updated')
      } else {
        await createCycle.mutateAsync(payload as any)
        toast.success('Cycle created')
      }
      onOpenChange(false)
    } catch {
      toast.error(isEditing ? 'Failed to update cycle' : 'Failed to create cycle')
    }
  }

  const isSubmitting = createCycle.isPending || updateCycle.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Cycle' : 'Add Cycle'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cycle_name">Cycle Name *</Label>
              <Input id="cycle_name" {...register('cycle_name')} placeholder="e.g., FY 2025-26" />
              {errors.cycle_name && (
                <p className="text-sm text-destructive">{errors.cycle_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cycle_code">Cycle Code *</Label>
              <Input id="cycle_code" {...register('cycle_code')} placeholder="e.g., FY2526" />
              {errors.cycle_code && (
                <p className="text-sm text-destructive">{errors.cycle_code.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cycle Type *</Label>
            <Select value={watch('cycle_type')} onValueChange={(v) => setValue('cycle_type', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {PERFORMANCE_CYCLE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.cycle_type && (
              <p className="text-sm text-destructive">{errors.cycle_type.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goal_setting_deadline">Goal Setting Deadline</Label>
              <Input
                id="goal_setting_deadline"
                type="date"
                {...register('goal_setting_deadline')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="self_review_deadline">Self Review Deadline</Label>
              <Input
                id="self_review_deadline"
                type="date"
                {...register('self_review_deadline')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager_review_deadline">Manager Review Deadline</Label>
              <Input
                id="manager_review_deadline"
                type="date"
                {...register('manager_review_deadline')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Optional description..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
