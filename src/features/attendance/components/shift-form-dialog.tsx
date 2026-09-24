import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useCreateShift, useUpdateShift } from '../hooks/use-attendance'
import type { Shift } from '@/types/database.types'
import { toast } from 'sonner'

const schema = z.object({
  name: z.string().min(1, 'Shift name is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  grace_period_minutes: z.coerce.number().min(0).default(15),
  is_default: z.boolean().default(false),
})

type FormData = z.output<typeof schema>

interface ShiftFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shift?: Shift | null
}

export function ShiftFormDialog({ open, onOpenChange, shift }: ShiftFormDialogProps) {
  const createShift = useCreateShift()
  const updateShift = useUpdateShift()
  const isEditing = !!shift

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<z.input<typeof schema>, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      start_time: '09:00',
      end_time: '18:00',
      grace_period_minutes: 15,
      is_default: false,
    },
  })

  const isDefault = watch('is_default')

  useEffect(() => {
    if (shift) {
      reset({
        name: shift.name,
        start_time: shift.start_time,
        end_time: shift.end_time,
        grace_period_minutes: shift.grace_period_minutes,
        is_default: shift.is_default,
      })
    } else {
      reset({
        name: '',
        start_time: '09:00',
        end_time: '18:00',
        grace_period_minutes: 15,
        is_default: false,
      })
    }
  }, [shift, reset])

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing) {
        await updateShift.mutateAsync({ id: shift.id, ...data })
        toast.success('Shift updated')
      } else {
        await createShift.mutateAsync(data)
        toast.success('Shift created')
      }
      onOpenChange(false)
    } catch {
      toast.error(isEditing ? 'Failed to update shift' : 'Failed to create shift')
    }
  }

  const isPending = createShift.isPending || updateShift.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Shift' : 'Add Shift'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update shift details.' : 'Create a new shift schedule.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Shift Name</Label>
            <Input {...register('name')} placeholder="e.g., Morning Shift" />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time</Label>
              <Input type="time" {...register('start_time')} />
              {errors.start_time && <p className="mt-1 text-xs text-destructive">{errors.start_time.message}</p>}
            </div>
            <div>
              <Label>End Time</Label>
              <Input type="time" {...register('end_time')} />
              {errors.end_time && <p className="mt-1 text-xs text-destructive">{errors.end_time.message}</p>}
            </div>
          </div>

          <div>
            <Label>Grace Period (minutes)</Label>
            <Input type="number" {...register('grace_period_minutes')} />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={isDefault}
              onCheckedChange={(checked) => setValue('is_default', checked)}
            />
            <Label>Default shift</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
