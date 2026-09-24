import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateInterviewStage, useUpdateInterviewStage } from '../hooks/use-recruitment'
import type { InterviewStage } from '@/types/database.types'
import { toast } from 'sonner'

const stageSchema = z.object({
  stage_name: z.string().min(1, 'Stage name is required'),
  stage_order: z.coerce.number().min(1, 'Order must be at least 1'),
})

type StageFormData = z.output<typeof stageSchema>

interface StageFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stage?: InterviewStage
}

export function StageFormDialog({ open, onOpenChange, stage }: StageFormDialogProps) {
  const isEditing = !!stage
  const createStage = useCreateInterviewStage()
  const updateStage = useUpdateInterviewStage()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof stageSchema>, unknown, StageFormData>({
    resolver: zodResolver(stageSchema),
    defaultValues: {
      stage_name: '',
      stage_order: 1,
    },
  })

  useEffect(() => {
    if (stage) {
      reset({
        stage_name: stage.stage_name,
        stage_order: stage.stage_order,
      })
    } else {
      reset({
        stage_name: '',
        stage_order: 1,
      })
    }
  }, [stage, reset])

  const onSubmit = async (data: StageFormData) => {
    try {
      if (isEditing && stage) {
        await updateStage.mutateAsync({ id: stage.id, ...data })
        toast.success('Stage updated')
      } else {
        await createStage.mutateAsync(data)
        toast.success('Stage created')
      }
      onOpenChange(false)
    } catch {
      toast.error('Failed to save stage')
    }
  }

  const isPending = createStage.isPending || updateStage.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Interview Stage' : 'Create Interview Stage'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stage_name">Stage Name *</Label>
            <Input id="stage_name" {...register('stage_name')} placeholder="e.g., Technical Round 1" />
            {errors.stage_name && <p className="text-sm text-destructive">{errors.stage_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="stage_order">Stage Order *</Label>
            <Input id="stage_order" type="number" min={1} {...register('stage_order')} placeholder="1" />
            {errors.stage_order && <p className="text-sm text-destructive">{errors.stage_order.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Stage' : 'Create Stage'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
