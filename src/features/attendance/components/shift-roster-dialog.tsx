import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAssignShiftRoster, useShifts } from '../hooks/use-attendance'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import { toast } from 'sonner'

const schema = z.object({
  employee_id: z.string().min(1, 'Employee is required'),
  shift_id: z.string().min(1, 'Shift is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface ShiftRosterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShiftRosterDialog({ open, onOpenChange }: ShiftRosterDialogProps) {
  const assignRoster = useAssignShiftRoster()
  const { data: shifts } = useShifts()
  const { data: employees } = useEmployees()

  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await assignRoster.mutateAsync({
        employee_id: data.employee_id,
        shift_id: data.shift_id,
        start_date: data.start_date,
        end_date: data.end_date || null,
      })
      toast.success('Shift assigned')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to assign shift')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Shift</DialogTitle>
          <DialogDescription>Assign an employee to a shift schedule.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Employee</Label>
            <Select onValueChange={(v) => setValue('employee_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {(employees || []).map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employee_id && <p className="mt-1 text-xs text-destructive">{errors.employee_id.message}</p>}
          </div>

          <div>
            <Label>Shift</Label>
            <Select onValueChange={(v) => setValue('shift_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                {(shifts || []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.start_time} - {s.end_time})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.shift_id && <p className="mt-1 text-xs text-destructive">{errors.shift_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input type="date" {...register('start_date')} />
              {errors.start_date && <p className="mt-1 text-xs text-destructive">{errors.start_date.message}</p>}
            </div>
            <div>
              <Label>End Date (optional)</Label>
              <Input type="date" {...register('end_date')} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={assignRoster.isPending}>
              {assignRoster.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
