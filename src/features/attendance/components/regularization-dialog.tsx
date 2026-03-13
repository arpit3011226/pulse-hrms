import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateRegularization } from '../hooks/use-attendance'
import { ATTENDANCE_STATUSES } from '@/lib/constants'
import { formatTime } from '../utils/attendance-utils'
import type { AttendanceRecord } from '@/types/database.types'
import { toast } from 'sonner'

const schema = z.object({
  requested_clock_in: z.string().optional(),
  requested_clock_out: z.string().optional(),
  requested_status: z.string().optional(),
  reason: z.string().min(1, 'Reason is required'),
})

type FormData = z.infer<typeof schema>

interface RegularizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: AttendanceRecord | null
  employeeId: string
}

export function RegularizationDialog({ open, onOpenChange, record, employeeId }: RegularizationDialogProps) {
  const createRegularization = useCreateRegularization()

  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    if (!record) return
    try {
      await createRegularization.mutateAsync({
        employee_id: employeeId,
        attendance_record_id: record.id,
        date: record.date,
        original_clock_in: record.clock_in,
        original_clock_out: record.clock_out,
        requested_clock_in: data.requested_clock_in ? `${record.date}T${data.requested_clock_in}:00` : null,
        requested_clock_out: data.requested_clock_out ? `${record.date}T${data.requested_clock_out}:00` : null,
        original_status: record.status,
        requested_status: data.requested_status || null,
        reason: data.reason,
      })
      toast.success('Regularization request submitted')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to submit request')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Regularization</DialogTitle>
          <DialogDescription>
            Request a correction to your attendance record for {record?.date}.
          </DialogDescription>
        </DialogHeader>
        {record && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Date:</span> {record.date}</p>
              <p><span className="text-muted-foreground">Current Clock In:</span> {formatTime(record.clock_in)}</p>
              <p><span className="text-muted-foreground">Current Clock Out:</span> {formatTime(record.clock_out)}</p>
              <p><span className="text-muted-foreground">Current Status:</span> {record.status}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Corrected Clock In</Label>
                <Input type="time" {...register('requested_clock_in')} />
              </div>
              <div>
                <Label>Corrected Clock Out</Label>
                <Input type="time" {...register('requested_clock_out')} />
              </div>
            </div>

            <div>
              <Label>Corrected Status</Label>
              <Select onValueChange={(v) => setValue('requested_status', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="No change" />
                </SelectTrigger>
                <SelectContent>
                  {ATTENDANCE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reason *</Label>
              <Textarea {...register('reason')} placeholder="Explain why this correction is needed..." />
              {errors.reason && <p className="mt-1 text-xs text-destructive">{errors.reason.message}</p>}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createRegularization.isPending}>
                {createRegularization.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
