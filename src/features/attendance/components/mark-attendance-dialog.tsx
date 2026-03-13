import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMarkAttendance, useShifts } from '../hooks/use-attendance'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import { ATTENDANCE_STATUSES } from '@/lib/constants'
import { calculateWorkHours } from '../utils/attendance-utils'
import { toast } from 'sonner'

const schema = z.object({
  employee_id: z.string().min(1, 'Employee is required'),
  date: z.string().min(1, 'Date is required'),
  clock_in: z.string().optional(),
  clock_out: z.string().optional(),
  status: z.string().min(1, 'Status is required'),
  shift_id: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface MarkAttendanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MarkAttendanceDialog({ open, onOpenChange }: MarkAttendanceDialogProps) {
  const markAttendance = useMarkAttendance()
  const { data: shifts } = useShifts()
  const { data: employees } = useEmployees()

  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'present' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      let workHours: number | undefined
      if (data.clock_in && data.clock_out) {
        const clockInFull = `${data.date}T${data.clock_in}:00`
        const clockOutFull = `${data.date}T${data.clock_out}:00`
        workHours = calculateWorkHours(clockInFull, clockOutFull)
      }

      await markAttendance.mutateAsync({
        employee_id: data.employee_id,
        date: data.date,
        clock_in: data.clock_in ? `${data.date}T${data.clock_in}:00` : null,
        clock_out: data.clock_out ? `${data.date}T${data.clock_out}:00` : null,
        status: data.status,
        shift_id: data.shift_id || null,
        work_hours: workHours ?? null,
        notes: data.notes || null,
      })
      toast.success('Attendance marked')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to mark attendance')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Attendance</DialogTitle>
          <DialogDescription>Manually mark attendance for an employee.</DialogDescription>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input type="date" {...register('date')} />
              {errors.date && <p className="mt-1 text-xs text-destructive">{errors.date.message}</p>}
            </div>
            <div>
              <Label>Status</Label>
              <Select defaultValue="present" onValueChange={(v) => setValue('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ATTENDANCE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Clock In</Label>
              <Input type="time" {...register('clock_in')} />
            </div>
            <div>
              <Label>Clock Out</Label>
              <Input type="time" {...register('clock_out')} />
            </div>
          </div>

          <div>
            <Label>Shift (optional)</Label>
            <Select onValueChange={(v) => setValue('shift_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                {(shifts || []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea {...register('notes')} placeholder="Optional notes..." />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={markAttendance.isPending}>
              {markAttendance.isPending ? 'Saving...' : 'Mark Attendance'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
