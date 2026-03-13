import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RELATIONSHIP_TYPES, GENDER_OPTIONS, NOMINEE_APPLICABLE_FOR } from '@/lib/constants'
import {
  useCreateDependent, useUpdateDependent,
  useCreateNominee, useUpdateNominee,
} from '../hooks/use-employee-lifecycle'
import type { EmployeeDependent, EmployeeNominee } from '@/types/database.types'
import { toast } from 'sonner'

const dependentSchema = z.object({
  dependent_name: z.string().min(1, 'Name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  dob: z.string().optional(),
  gender: z.string().optional(),
  is_nominee: z.boolean().optional(),
})

const nomineeSchema = z.object({
  nominee_name: z.string().min(1, 'Name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  allocation_percent: z.number().min(1).max(100),
  applicable_for: z.string().min(1, 'Applicable for is required'),
})

interface EmployeeDependentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
  type: 'dependent' | 'nominee'
  dependent?: EmployeeDependent
  nominee?: EmployeeNominee
}

export function EmployeeDependentForm({ open, onOpenChange, employeeId, type, dependent, nominee }: EmployeeDependentFormProps) {
  if (type === 'dependent') {
    return <DependentForm open={open} onOpenChange={onOpenChange} employeeId={employeeId} dependent={dependent} />
  }
  return <NomineeForm open={open} onOpenChange={onOpenChange} employeeId={employeeId} nominee={nominee} />
}

function DependentForm({ open, onOpenChange, employeeId, dependent }: { open: boolean; onOpenChange: (open: boolean) => void; employeeId: string; dependent?: EmployeeDependent }) {
  const isEditing = !!dependent
  const createDep = useCreateDependent()
  const updateDep = useUpdateDependent()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(dependentSchema),
    defaultValues: dependent ? {
      dependent_name: dependent.dependent_name,
      relationship: dependent.relationship,
      dob: dependent.dob || '',
      gender: dependent.gender || '',
      is_nominee: dependent.is_nominee,
    } : { is_nominee: false },
  })

  const onSubmit = async (data: z.infer<typeof dependentSchema>) => {
    try {
      const cleaned = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
      )
      if (isEditing) {
        await updateDep.mutateAsync({ id: dependent.id, ...cleaned })
        toast.success('Dependent updated')
      } else {
        await createDep.mutateAsync({ ...cleaned, employee_id: employeeId })
        toast.success('Dependent added')
      }
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to save dependent')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Dependent' : 'Add Dependent'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dependent_name">Name *</Label>
            <Input id="dependent_name" {...register('dependent_name')} />
            {errors.dependent_name && <p className="text-sm text-destructive">{errors.dependent_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Relationship *</Label>
            <Select onValueChange={(v) => setValue('relationship', v)} defaultValue={dependent?.relationship}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.relationship && <p className="text-sm text-destructive">{errors.relationship.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" type="date" {...register('dob')} />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select onValueChange={(v) => setValue('gender', v)} defaultValue={dependent?.gender || undefined}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={watch('is_nominee')} onCheckedChange={(v) => setValue('is_nominee', v)} />
            <Label>Also a Nominee</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function NomineeForm({ open, onOpenChange, employeeId, nominee }: { open: boolean; onOpenChange: (open: boolean) => void; employeeId: string; nominee?: EmployeeNominee }) {
  const isEditing = !!nominee
  const createNom = useCreateNominee()
  const updateNom = useUpdateNominee()

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(nomineeSchema),
    defaultValues: nominee ? {
      nominee_name: nominee.nominee_name,
      relationship: nominee.relationship,
      allocation_percent: nominee.allocation_percent,
      applicable_for: nominee.applicable_for,
    } : { allocation_percent: 100 },
  })

  const onSubmit = async (data: z.infer<typeof nomineeSchema>) => {
    try {
      const payload = { ...data, applicable_for: data.applicable_for as EmployeeNominee['applicable_for'] }
      if (isEditing) {
        await updateNom.mutateAsync({ id: nominee.id, ...payload })
        toast.success('Nominee updated')
      } else {
        await createNom.mutateAsync({ ...payload, employee_id: employeeId })
        toast.success('Nominee added')
      }
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to save nominee')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Nominee' : 'Add Nominee'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nominee_name">Nominee Name *</Label>
            <Input id="nominee_name" {...register('nominee_name')} />
            {errors.nominee_name && <p className="text-sm text-destructive">{errors.nominee_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Relationship *</Label>
            <Select onValueChange={(v) => setValue('relationship', v)} defaultValue={nominee?.relationship}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.relationship && <p className="text-sm text-destructive">{errors.relationship.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="allocation_percent">Allocation % *</Label>
              <Input id="allocation_percent" type="number" min={1} max={100} {...register('allocation_percent', { valueAsNumber: true })} />
              {errors.allocation_percent && <p className="text-sm text-destructive">{errors.allocation_percent.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Applicable For *</Label>
              <Select onValueChange={(v) => setValue('applicable_for', v)} defaultValue={nominee?.applicable_for}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {NOMINEE_APPLICABLE_FOR.map(n => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.applicable_for && <p className="text-sm text-destructive">{errors.applicable_for.message}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
