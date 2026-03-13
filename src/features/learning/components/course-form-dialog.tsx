import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { COURSE_MODES } from '@/lib/constants'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useCourseCategories, useCreateCourse, useUpdateCourse, useCurrentEmployee } from '../hooks/use-learning'
import type { TrainingCourse } from '@/types/database.types'
import { toast } from 'sonner'

const schema = z.object({
  course_code: z.string().min(1, 'Course code is required'),
  course_name: z.string().min(1, 'Course name is required'),
  description: z.string().optional(),
  category_id: z.string().optional(),
  mode: z.string().min(1, 'Mode is required'),
  duration_hours: z.coerce.number().min(0).optional().or(z.literal('')),
  instructor_name: z.string().optional(),
  max_participants: z.coerce.number().min(1).optional().or(z.literal('')),
  syllabus: z.string().optional(),
  prerequisites: z.string().optional(),
  is_mandatory: z.boolean().default(false),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  course?: TrainingCourse
}

export function CourseFormDialog({ open, onOpenChange, course }: Props) {
  const { organization } = useAuth()
  const { data: currentEmployee } = useCurrentEmployee()
  const { data: categories } = useCourseCategories()
  const createCourse = useCreateCourse()
  const updateCourse = useUpdateCourse()

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      course_code: '',
      course_name: '',
      description: '',
      category_id: '',
      mode: 'online',
      duration_hours: '',
      instructor_name: '',
      max_participants: '',
      syllabus: '',
      prerequisites: '',
      is_mandatory: false,
    },
  })

  useEffect(() => {
    if (open) {
      if (course) {
        form.reset({
          course_code: course.course_code,
          course_name: course.course_name,
          description: course.description ?? '',
          category_id: course.category_id ?? '',
          mode: course.mode,
          duration_hours: course.duration_hours ?? '',
          instructor_name: course.instructor_name ?? '',
          max_participants: course.max_participants ?? '',
          syllabus: course.syllabus ?? '',
          prerequisites: course.prerequisites ?? '',
          is_mandatory: course.is_mandatory,
        })
      } else {
        form.reset({
          course_code: '',
          course_name: '',
          description: '',
          category_id: '',
          mode: 'online',
          duration_hours: '',
          instructor_name: '',
          max_participants: '',
          syllabus: '',
          prerequisites: '',
          is_mandatory: false,
        })
      }
    }
  }, [open, course])

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        category_id: data.category_id || null,
        duration_hours: data.duration_hours === '' ? null : Number(data.duration_hours),
        max_participants: data.max_participants === '' ? null : Number(data.max_participants),
      }
      if (course) {
        await updateCourse.mutateAsync({ id: course.id, ...payload })
        toast.success('Course updated')
      } else {
        await createCourse.mutateAsync({
          organization_id: organization!.id,
          created_by: currentEmployee?.id,
          ...payload,
        } as any)
        toast.success('Course created')
      }
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save course')
    }
  }

  const isPending = createCourse.isPending || updateCourse.isPending
  const activeCategories = (categories ?? []).filter((c) => c.is_active)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{course ? 'Edit Course' : 'New Course'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="course_code">Course Code *</Label>
                <Input id="course_code" {...form.register('course_code')} placeholder="e.g. CS101" />
                {form.formState.errors.course_code && (
                  <p className="mt-1 text-sm text-destructive">{form.formState.errors.course_code.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="course_name">Course Name *</Label>
                <Input id="course_name" {...form.register('course_name')} />
                {form.formState.errors.course_name && (
                  <p className="mt-1 text-sm text-destructive">{form.formState.errors.course_name.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...form.register('description')} rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={form.watch('category_id') || ''}
                  onValueChange={(v) => form.setValue('category_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.category_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mode *</Label>
                <Select
                  value={form.watch('mode')}
                  onValueChange={(v) => form.setValue('mode', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSE_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="duration_hours">Duration (hours)</Label>
                <Input id="duration_hours" type="number" step="0.5" {...form.register('duration_hours')} />
              </div>
              <div>
                <Label htmlFor="max_participants">Max Participants</Label>
                <Input id="max_participants" type="number" {...form.register('max_participants')} />
              </div>
              <div>
                <Label htmlFor="instructor_name">Instructor</Label>
                <Input id="instructor_name" {...form.register('instructor_name')} />
              </div>
            </div>

            <div>
              <Label htmlFor="syllabus">Syllabus</Label>
              <Textarea id="syllabus" {...form.register('syllabus')} rows={3} />
            </div>

            <div>
              <Label htmlFor="prerequisites">Prerequisites</Label>
              <Textarea id="prerequisites" {...form.register('prerequisites')} rows={2} />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_mandatory"
                checked={form.watch('is_mandatory')}
                onCheckedChange={(v) => form.setValue('is_mandatory', v)}
              />
              <Label htmlFor="is_mandatory">Mandatory Course</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : course ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
