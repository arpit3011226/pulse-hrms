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
import { COMPETENCY_CATEGORIES } from '@/lib/constants'
import {
  useCreateReviewCompetency,
  useUpdateReviewCompetency,
} from '../hooks/use-performance'
import { toast } from 'sonner'
import type { ReviewCompetency } from '@/types/database.types'

const competencySchema = z.object({
  competency_name: z.string().min(1, 'Competency name is required'),
  competency_code: z.string().min(1, 'Competency code is required'),
  category: z.enum(['core', 'functional', 'leadership'], { error: 'Category is required' }),
  description: z.string().optional().or(z.literal('')),
  display_order: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
})

type CompetencyFormData = z.output<typeof competencySchema>

interface CompetencyFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  competency?: ReviewCompetency
}

export function CompetencyFormDialog({ open, onOpenChange, competency }: CompetencyFormDialogProps) {
  const isEditing = !!competency
  const createCompetency = useCreateReviewCompetency()
  const updateCompetency = useUpdateReviewCompetency()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof competencySchema>, unknown, CompetencyFormData>({
    resolver: zodResolver(competencySchema),
    defaultValues: {
      competency_name: '',
      competency_code: '',
      category: 'core',
      description: '',
      display_order: 0,
      is_active: true,
    },
  })

  useEffect(() => {
    if (open) {
      if (competency) {
        reset({
          competency_name: competency.competency_name,
          competency_code: competency.competency_code,
          category: competency.category,
          description: competency.description ?? '',
          display_order: competency.display_order,
          is_active: competency.is_active,
        })
      } else {
        reset({
          competency_name: '',
          competency_code: '',
          category: 'core',
          description: '',
          display_order: 0,
          is_active: true,
        })
      }
    }
  }, [open, competency, reset])

  const onSubmit = async (data: CompetencyFormData) => {
    const payload = {
      competency_name: data.competency_name,
      competency_code: data.competency_code,
      category: data.category,
      description: data.description || null,
      display_order: data.display_order,
      is_active: data.is_active,
    }

    try {
      if (isEditing) {
        await updateCompetency.mutateAsync({ id: competency.id, ...payload })
        toast.success('Competency updated')
      } else {
        await createCompetency.mutateAsync(payload)
        toast.success('Competency created')
      }
      onOpenChange(false)
    } catch (err: unknown) {
      console.error('Competency save error:', err)
      const msg = err instanceof Error ? err.message : (isEditing ? 'Failed to update competency' : 'Failed to create competency')
      toast.error(msg)
    }
  }

  const isSubmitting = createCompetency.isPending || updateCompetency.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Competency' : 'Add Competency'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="competency_name">Competency Name *</Label>
            <Input
              id="competency_name"
              {...register('competency_name')}
              placeholder="e.g., Communication"
            />
            {errors.competency_name && (
              <p className="text-sm text-destructive">{errors.competency_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="competency_code">Competency Code *</Label>
            <Input
              id="competency_code"
              {...register('competency_code')}
              placeholder="e.g., COMM"
            />
            {errors.competency_code && (
              <p className="text-sm text-destructive">{errors.competency_code.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={watch('category')} onValueChange={(v) => setValue('category', v as CompetencyFormData['category'])}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {COMPETENCY_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                min={0}
                {...register('display_order')}
              />
              {errors.display_order && (
                <p className="text-sm text-destructive">{errors.display_order.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-7">
              <input
                id="is_active"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={watch('is_active')}
                onChange={(e) => setValue('is_active', e.target.checked)}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
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
