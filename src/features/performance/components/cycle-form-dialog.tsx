import { useEffect, useState } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PERFORMANCE_CYCLE_TYPES } from '@/lib/constants'
import {
  useCreatePerformanceCycle,
  useUpdatePerformanceCycle,
} from '../hooks/use-performance'
import { toast } from 'sonner'
import type { PerformanceCycle, SkipCriteria } from '@/types/database.types'

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

const EMPLOYMENT_TYPES = [
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'probation', label: 'Probation' },
]

export function CycleFormDialog({ open, onOpenChange, cycle }: CycleFormDialogProps) {
  const isEditing = !!cycle
  const createCycle = useCreatePerformanceCycle()
  const updateCycle = useUpdatePerformanceCycle()

  const [skipCriteria, setSkipCriteria] = useState<SkipCriteria>({
    min_tenure_months: 3,
    exclude_employment_types: [],
    exclude_on_leave: false,
  })

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existing = (cycle as any).skip_criteria as SkipCriteria | null
        setSkipCriteria({
          min_tenure_months: existing?.min_tenure_months ?? 3,
          exclude_employment_types: existing?.exclude_employment_types ?? [],
          exclude_on_leave: existing?.exclude_on_leave ?? false,
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
        setSkipCriteria({ min_tenure_months: 3, exclude_employment_types: [], exclude_on_leave: false })
      }
    }
  }, [open, cycle, reset])

  const onSubmit = async (data: CycleFormData) => {
    const basePayload = {
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
        await updateCycle.mutateAsync({ id: cycle.id, ...basePayload } as any)
        toast.success('Cycle updated')
      } else {
        await createCycle.mutateAsync(basePayload as any)
        toast.success('Cycle created')
      }
      onOpenChange(false)
    } catch (err) {
      console.error('Cycle save error:', err)
      toast.error(isEditing ? 'Failed to update cycle' : 'Failed to create cycle')
    }
  }

  const isSubmitting = createCycle.isPending || updateCycle.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] flex flex-col mx-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Cycle' : 'Add Cycle'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 max-h-[60vh] pr-4">
          <div className="space-y-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="manager_review_deadline">Manager Review Deadline</Label>
            <Input
              id="manager_review_deadline"
              type="date"
              {...register('manager_review_deadline')}
            />
          </div>

          <Separator />

          {/* Skip Criteria */}
          <div className="space-y-3">
            <Label className="text-base">Skip Criteria</Label>
            <p className="text-xs text-muted-foreground -mt-1">
              Employees matching these criteria will be skipped when reviews are initiated.
            </p>

            <div className="space-y-2">
              <Label htmlFor="min_tenure">Minimum Tenure (months)</Label>
              <Input
                id="min_tenure"
                type="number"
                min={0}
                value={skipCriteria.min_tenure_months ?? 0}
                onChange={(e) =>
                  setSkipCriteria((prev) => ({
                    ...prev,
                    min_tenure_months: Number(e.target.value),
                  }))
                }
              />
              <p className="text-[11px] text-muted-foreground">
                Employees who joined less than this many months ago will be skipped.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Exclude Employment Types</Label>
              <div className="flex flex-wrap gap-3">
                {EMPLOYMENT_TYPES.map((type) => (
                  <label key={type.value} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={(skipCriteria.exclude_employment_types || []).includes(type.value)}
                      onCheckedChange={(checked) => {
                        setSkipCriteria((prev) => ({
                          ...prev,
                          exclude_employment_types: checked
                            ? [...(prev.exclude_employment_types || []), type.value]
                            : (prev.exclude_employment_types || []).filter((t) => t !== type.value),
                        }))
                      }}
                    />
                    <span className="text-sm">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={skipCriteria.exclude_on_leave ?? false}
                onCheckedChange={(checked) =>
                  setSkipCriteria((prev) => ({ ...prev, exclude_on_leave: !!checked }))
                }
              />
              <span className="text-sm">Exclude employees currently on leave</span>
            </label>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Optional description..."
              rows={3}
            />
          </div>

          </div>
          </ScrollArea>
          <DialogFooter className="pt-4">
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
