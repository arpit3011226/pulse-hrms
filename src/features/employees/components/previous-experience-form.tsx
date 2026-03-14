import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { EMPLOYMENT_TYPES } from '@/lib/constants'
import { useCreatePreviousExperience, useUpdatePreviousExperience } from '../hooks/use-employee-lifecycle'
import type { EmployeePreviousExperience } from '@/types/database.types'
import { toast } from 'sonner'

const experienceSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  designation: z.string().optional(),
  department: z.string().optional(),
  employment_type: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  location: z.string().optional(),
  reason_for_leaving: z.string().optional(),
})

type ExperienceFormData = z.infer<typeof experienceSchema>

interface PreviousExperienceFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
  experience?: EmployeePreviousExperience
}

export function PreviousExperienceForm({ open, onOpenChange, employeeId, experience }: PreviousExperienceFormProps) {
  const isEditing = !!experience
  const createExp = useCreatePreviousExperience()
  const updateExp = useUpdatePreviousExperience()

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<ExperienceFormData>({
    resolver: zodResolver(experienceSchema) as any,
    defaultValues: experience ? {
      company_name: experience.company_name,
      designation: experience.designation || '',
      department: experience.department || '',
      employment_type: experience.employment_type || '',
      start_date: experience.start_date,
      end_date: experience.end_date || '',
      location: experience.location || '',
      reason_for_leaving: experience.reason_for_leaving || '',
    } : {},
  })

  const onSubmit = async (data: ExperienceFormData) => {
    try {
      const cleaned = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
      )
      if (isEditing) {
        await updateExp.mutateAsync({ id: experience.id, ...cleaned })
        toast.success('Experience updated')
      } else {
        await createExp.mutateAsync({ ...cleaned, employee_id: employeeId })
        toast.success('Experience added')
      }
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save experience')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Experience' : 'Add Previous Experience'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name *</Label>
            <Input id="company_name" {...register('company_name')} placeholder="e.g., Infosys Ltd." />
            {errors.company_name && <p className="text-sm text-destructive">{errors.company_name.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input id="designation" {...register('designation')} placeholder="e.g., Senior Developer" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" {...register('department')} placeholder="e.g., Engineering" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <Select onValueChange={(v) => setValue('employment_type', v)} defaultValue={experience?.employment_type || undefined}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...register('location')} placeholder="e.g., Bangalore" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input id="start_date" type="date" {...register('start_date')} />
              {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input id="end_date" type="date" {...register('end_date')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason_for_leaving">Reason for Leaving</Label>
            <Textarea id="reason_for_leaving" rows={2} {...register('reason_for_leaving')} placeholder="e.g., Better opportunity" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
