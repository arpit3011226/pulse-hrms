import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useCreateCategory, useUpdateCategory } from '../hooks/use-learning'
import type { CourseCategory } from '@/types/database.types'
import { toast } from 'sonner'

const schema = z.object({
  category_name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: CourseCategory
}

export function CategoryFormDialog({ open, onOpenChange, category }: Props) {
  const { organization } = useAuth()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      category_name: '',
      description: '',
      is_active: true,
    },
  })

  useEffect(() => {
    if (open) {
      if (category) {
        form.reset({
          category_name: category.category_name,
          description: category.description ?? '',
          is_active: category.is_active,
        })
      } else {
        form.reset({ category_name: '', description: '', is_active: true })
      }
    }
  }, [open, category])

  const onSubmit = async (data: FormData) => {
    try {
      if (category) {
        await updateCategory.mutateAsync({ id: category.id, ...data })
        toast.success('Category updated')
      } else {
        await createCategory.mutateAsync({
          organization_id: organization!.id,
          ...data,
        })
        toast.success('Category created')
      }
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save category')
    }
  }

  const isPending = createCategory.isPending || updateCategory.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Category' : 'New Category'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="category_name">Category Name *</Label>
            <Input id="category_name" {...form.register('category_name')} />
            {form.formState.errors.category_name && (
              <p className="mt-1 text-sm text-destructive">{form.formState.errors.category_name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...form.register('description')} rows={3} />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={form.watch('is_active')}
              onCheckedChange={(v) => form.setValue('is_active', v)}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : category ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
