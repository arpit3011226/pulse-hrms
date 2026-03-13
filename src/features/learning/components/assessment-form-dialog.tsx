import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ASSESSMENT_TYPES } from '@/lib/constants'
import { useTrainingCourses, useCreateAssessment, useUpdateAssessment } from '../hooks/use-learning'
import type { TrainingAssessment } from '@/types/database.types'
import { toast } from 'sonner'

const schema = z.object({
  course_id: z.string().min(1, 'Course is required'),
  assessment_name: z.string().min(1, 'Name is required'),
  assessment_type: z.string().min(1, 'Type is required'),
  total_marks: z.coerce.number().min(1, 'Must be at least 1'),
  passing_marks: z.coerce.number().min(0),
  duration_minutes: z.coerce.number().min(0).optional().or(z.literal('')),
  is_mandatory: z.boolean().default(true),
  display_order: z.coerce.number().min(0).default(0),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  assessment?: TrainingAssessment
}

export function AssessmentFormDialog({ open, onOpenChange, assessment }: Props) {
  const { data: courses } = useTrainingCourses()
  const createAssessment = useCreateAssessment()
  const updateAssessment = useUpdateAssessment()

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      course_id: '',
      assessment_name: '',
      assessment_type: 'quiz',
      total_marks: 100,
      passing_marks: 40,
      duration_minutes: '',
      is_mandatory: true,
      display_order: 0,
    },
  })

  useEffect(() => {
    if (open) {
      if (assessment) {
        form.reset({
          course_id: assessment.course_id,
          assessment_name: assessment.assessment_name,
          assessment_type: assessment.assessment_type,
          total_marks: assessment.total_marks,
          passing_marks: assessment.passing_marks,
          duration_minutes: assessment.duration_minutes ?? '',
          is_mandatory: assessment.is_mandatory,
          display_order: assessment.display_order,
        })
      } else {
        form.reset({
          course_id: '',
          assessment_name: '',
          assessment_type: 'quiz',
          total_marks: 100,
          passing_marks: 40,
          duration_minutes: '',
          is_mandatory: true,
          display_order: 0,
        })
      }
    }
  }, [open, assessment])

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        duration_minutes: data.duration_minutes === '' ? null : Number(data.duration_minutes),
      }
      if (assessment) {
        await updateAssessment.mutateAsync({ id: assessment.id, ...payload })
        toast.success('Assessment updated')
      } else {
        await createAssessment.mutateAsync(payload as any)
        toast.success('Assessment created')
      }
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save assessment')
    }
  }

  const isPending = createAssessment.isPending || updateAssessment.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{assessment ? 'Edit Assessment' : 'New Assessment'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Course *</Label>
            <Select
              value={form.watch('course_id')}
              onValueChange={(v) => form.setValue('course_id', v)}
              disabled={!!assessment}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {(courses ?? []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.course_name} ({c.course_code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.course_id && (
              <p className="mt-1 text-sm text-destructive">{form.formState.errors.course_id.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="assessment_name">Assessment Name *</Label>
            <Input id="assessment_name" {...form.register('assessment_name')} />
            {form.formState.errors.assessment_name && (
              <p className="mt-1 text-sm text-destructive">{form.formState.errors.assessment_name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type *</Label>
              <Select
                value={form.watch('assessment_type')}
                onValueChange={(v) => form.setValue('assessment_type', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSESSMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="duration_minutes">Duration (minutes)</Label>
              <Input id="duration_minutes" type="number" {...form.register('duration_minutes')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="total_marks">Total Marks *</Label>
              <Input id="total_marks" type="number" {...form.register('total_marks')} />
            </div>
            <div>
              <Label htmlFor="passing_marks">Passing Marks *</Label>
              <Input id="passing_marks" type="number" {...form.register('passing_marks')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="display_order">Display Order</Label>
              <Input id="display_order" type="number" {...form.register('display_order')} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                id="is_mandatory"
                checked={form.watch('is_mandatory')}
                onCheckedChange={(v) => form.setValue('is_mandatory', v)}
              />
              <Label htmlFor="is_mandatory">Mandatory</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : assessment ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
