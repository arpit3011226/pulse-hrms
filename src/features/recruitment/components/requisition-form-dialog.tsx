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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { EMPLOYMENT_TYPES } from '@/lib/constants'
import { useCreateJobRequisition, useUpdateJobRequisition } from '../hooks/use-recruitment'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import type { JobRequisition, JobRequisitionWithRelations } from '@/types/database.types'
import { toast } from 'sonner'

const requisitionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  requisition_code: z.string().optional(),
  department_id: z.string().min(1, 'Department is required'),
  hiring_manager_id: z.string().optional(),
  employment_type: z.string().min(1, 'Employment type is required'),
  headcount: z.coerce.number().min(1, 'Headcount must be at least 1'),
  description: z.string().optional(),
  requirements: z.string().optional(),
  min_experience: z.coerce.number().min(0).optional().or(z.literal('')),
  max_experience: z.coerce.number().min(0).optional().or(z.literal('')),
  min_salary: z.coerce.number().min(0).optional().or(z.literal('')),
  max_salary: z.coerce.number().min(0).optional().or(z.literal('')),
  location: z.string().optional(),
})

type RequisitionFormData = z.infer<typeof requisitionSchema>

interface RequisitionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requisition?: JobRequisitionWithRelations
}

export function RequisitionFormDialog({ open, onOpenChange, requisition }: RequisitionFormDialogProps) {
  const isEditing = !!requisition
  const { organization } = useAuth()
  const createRequisition = useCreateJobRequisition()
  const updateRequisition = useUpdateJobRequisition()

  const { data: departments } = useQuery({
    queryKey: ['departments', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return []
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data || []
    },
    enabled: open && !!organization?.id,
  })

  const { data: employees } = useQuery({
    queryKey: ['employees-list', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return []
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_code')
        .eq('organization_id', organization.id)
        .eq('status', 'active')
        .order('first_name')
      if (error) throw error
      return data || []
    },
    enabled: open && !!organization?.id,
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RequisitionFormData>({
    resolver: zodResolver(requisitionSchema) as any,
    defaultValues: {
      title: '',
      requisition_code: '',
      department_id: '',
      hiring_manager_id: '',
      employment_type: 'full_time',
      headcount: 1,
      description: '',
      requirements: '',
      min_experience: '',
      max_experience: '',
      min_salary: '',
      max_salary: '',
      location: '',
    },
  })

  const departmentId = watch('department_id')
  const hiringManagerId = watch('hiring_manager_id')
  const employmentType = watch('employment_type')

  useEffect(() => {
    if (requisition) {
      reset({
        title: requisition.title,
        requisition_code: requisition.requisition_code || '',
        department_id: requisition.department_id || '',
        hiring_manager_id: requisition.hiring_manager_id || '',
        employment_type: requisition.employment_type || 'full_time',
        headcount: requisition.headcount || 1,
        description: requisition.description || '',
        requirements: requisition.requirements || '',
        min_experience: requisition.min_experience ?? '',
        max_experience: requisition.max_experience ?? '',
        min_salary: requisition.budget?.min_salary ?? '',
        max_salary: requisition.budget?.max_salary ?? '',
        location: requisition.location || '',
      })
    } else {
      reset({
        title: '',
        requisition_code: '',
        department_id: '',
        hiring_manager_id: '',
        employment_type: 'full_time',
        headcount: 1,
        description: '',
        requirements: '',
        min_experience: '',
        max_experience: '',
        min_salary: '',
        max_salary: '',
        location: '',
      })
    }
  }, [requisition, reset])

  const onSubmit = async (data: RequisitionFormData) => {
    try {
      const payload = {
        title: data.title,
        requisition_code: data.requisition_code || undefined,
        department_id: data.department_id,
        hiring_manager_id: data.hiring_manager_id || undefined,
        employment_type: data.employment_type as JobRequisition['employment_type'],
        headcount: data.headcount,
        description: data.description || undefined,
        requirements: data.requirements || undefined,
        min_experience: data.min_experience !== '' ? Number(data.min_experience) : undefined,
        max_experience: data.max_experience !== '' ? Number(data.max_experience) : undefined,
        min_salary: data.min_salary !== '' ? Number(data.min_salary) : undefined,
        max_salary: data.max_salary !== '' ? Number(data.max_salary) : undefined,
        location: data.location || undefined,
      }

      if (isEditing && requisition) {
        await updateRequisition.mutateAsync({ id: requisition.id, ...payload })
        toast.success('Requisition updated')
      } else {
        await createRequisition.mutateAsync(payload)
        toast.success('Requisition created')
      }
      onOpenChange(false)
    } catch {
      toast.error('Failed to save requisition')
    }
  }

  const isPending = createRequisition.isPending || updateRequisition.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Requisition' : 'Create Requisition'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-4">
              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="title">Job Title *</Label>
                  <Input id="title" {...register('title')} placeholder="e.g., Senior Software Engineer" />
                  {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requisition_code">Requisition Code</Label>
                  <Input id="requisition_code" {...register('requisition_code')} placeholder="e.g., REQ-2024-001" />
                </div>
                <div className="space-y-2">
                  <Label>Department *</Label>
                  <Select value={departmentId} onValueChange={(v) => setValue('department_id', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {(departments || []).map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.department_id && <p className="text-sm text-destructive">{errors.department_id.message}</p>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Hiring Manager</Label>
                  <Select value={hiringManagerId || ''} onValueChange={(v) => setValue('hiring_manager_id', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {(employees || []).map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} ({emp.employee_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Employment Type *</Label>
                  <Select value={employmentType} onValueChange={(v) => setValue('employment_type', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.employment_type && <p className="text-sm text-destructive">{errors.employment_type.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="headcount">Headcount *</Label>
                  <Input id="headcount" type="number" min={1} {...register('headcount')} />
                  {errors.headcount && <p className="text-sm text-destructive">{errors.headcount.message}</p>}
                </div>
              </div>

              <Separator />

              {/* Description & Requirements */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Job Description</Label>
                  <Textarea id="description" {...register('description')} rows={4} placeholder="Describe the role and responsibilities..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requirements">Requirements</Label>
                  <Textarea id="requirements" {...register('requirements')} rows={4} placeholder="List qualifications and skills required..." />
                </div>
              </div>

              <Separator />

              {/* Experience & Salary */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="min_experience">Min Experience (years)</Label>
                  <Input id="min_experience" type="number" min={0} {...register('min_experience')} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_experience">Max Experience (years)</Label>
                  <Input id="max_experience" type="number" min={0} {...register('max_experience')} placeholder="10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_salary">Min Salary</Label>
                  <Input id="min_salary" type="number" min={0} {...register('min_salary')} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_salary">Max Salary</Label>
                  <Input id="max_salary" type="number" min={0} {...register('max_salary')} placeholder="0" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" {...register('location')} placeholder="e.g., Mumbai, Remote, Hybrid" />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Requisition' : 'Create Requisition'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
