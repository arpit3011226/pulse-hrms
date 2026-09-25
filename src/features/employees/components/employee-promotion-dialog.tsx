import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ORG_CHANGE_TYPES } from '@/lib/constants'
import { useCreateWorkProfile } from '../hooks/use-employee-lifecycle'
import type { Employee } from '@/types/database.types'
import { toast } from 'sonner'

const promotionSchema = z.object({
  change_type: z.enum(['promotion', 'transfer', 'redesignation', 'manager_change', 'initial_assignment'], {
    error: 'Change type is required',
  }),
  department_id: z.string().optional(),
  designation_id: z.string().optional(),
  reporting_manager_id: z.string().optional(),
  effective_from: z.string().min(1, 'Effective date is required'),
  change_reason: z.string().optional(),
  remarks: z.string().optional(),
})

type PromotionFormData = z.infer<typeof promotionSchema>

interface EmployeePromotionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: Employee
  departments: { id: string; name: string }[]
  designations: { id: string; title: string }[]
  managers: { id: string; first_name: string; last_name: string }[]
}

export function EmployeePromotionDialog({ open, onOpenChange, employee, departments, designations, managers }: EmployeePromotionDialogProps) {
  const createWorkProfile = useCreateWorkProfile()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<PromotionFormData>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      department_id: employee.department_id || '',
      designation_id: employee.designation_id || '',
      reporting_manager_id: employee.reporting_manager_id || '',
      effective_from: new Date().toISOString().split('T')[0],
    },
  })

  const changeType = watch('change_type')

  const onSubmit = async (data: PromotionFormData) => {
    try {
      const cleanVal = (v: string | undefined) => v === '' ? null : v

      await createWorkProfile.mutateAsync({
        employee_id: employee.id,
        department_id: cleanVal(data.department_id) || employee.department_id,
        designation_id: cleanVal(data.designation_id) || employee.designation_id,
        reporting_manager_id: cleanVal(data.reporting_manager_id) || employee.reporting_manager_id,
        effective_from: data.effective_from,
        change_reason: data.change_reason || null,
        orgHistory: {
          employee_id: employee.id,
          change_type: data.change_type,
          old_department_id: employee.department_id,
          new_department_id: cleanVal(data.department_id) || employee.department_id,
          old_designation_id: employee.designation_id,
          new_designation_id: cleanVal(data.designation_id) || employee.designation_id,
          old_manager_id: employee.reporting_manager_id,
          new_manager_id: cleanVal(data.reporting_manager_id) || employee.reporting_manager_id,
          effective_from: data.effective_from,
          remarks: data.remarks || null,
        },
      })
      toast.success('Work profile updated successfully')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to update work profile')
    }
  }

  const filteredManagers = managers.filter(m => m.id !== employee.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle>Promote / Transfer Employee</DialogTitle>
          <DialogDescription>
            Update {employee.first_name}'s organizational assignment. This creates a new work profile entry and logs the change in history.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Change Type *</Label>
            <Select onValueChange={(v) => setValue('change_type', v as PromotionFormData['change_type'])}>
              <SelectTrigger><SelectValue placeholder="Select change type" /></SelectTrigger>
              <SelectContent>
                {ORG_CHANGE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.change_type && <p className="text-sm text-destructive">{errors.change_type.message}</p>}
          </div>

          {(changeType === 'promotion' || changeType === 'redesignation') && (
            <div className="space-y-2">
              <Label>New Designation</Label>
              <Select onValueChange={(v) => setValue('designation_id', v)} defaultValue={employee.designation_id || undefined}>
                <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                <SelectContent>
                  {designations.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(changeType === 'transfer' || changeType === 'promotion') && (
            <div className="space-y-2">
              <Label>New Department</Label>
              <Select onValueChange={(v) => setValue('department_id', v)} defaultValue={employee.department_id || undefined}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {changeType === 'manager_change' && (
            <div className="space-y-2">
              <Label>New Reporting Manager</Label>
              <Select onValueChange={(v) => setValue('reporting_manager_id', v)} defaultValue={employee.reporting_manager_id || undefined}>
                <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                <SelectContent>
                  {filteredManagers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="effective_from">Effective Date *</Label>
            <Input id="effective_from" type="date" {...register('effective_from')} />
            {errors.effective_from && <p className="text-sm text-destructive">{errors.effective_from.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="change_reason">Reason</Label>
            <Textarea id="change_reason" {...register('change_reason')} placeholder="Reason for the change..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" {...register('remarks')} placeholder="Additional notes..." />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply Change
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
