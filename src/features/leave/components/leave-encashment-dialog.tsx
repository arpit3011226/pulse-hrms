import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLeaveTypes, useCurrentEmployee, useMyLeaveBalances, useCreateEncashmentRequest } from '../hooks/use-leave'
import { getAvailableBalance } from '../utils/leave-utils'
import type { LeaveBalanceWithRelations } from '@/types/database.types'
import { toast } from 'sonner'
import { useMemo } from 'react'

const encashmentSchema = z.object({
  leave_type_id: z.string().min(1, 'Select a leave type'),
  days_requested: z.coerce.number().min(1, 'Minimum 1 day'),
  remarks: z.string().optional(),
})

type EncashmentFormData = z.output<typeof encashmentSchema>

interface LeaveEncashmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LeaveEncashmentDialog({ open, onOpenChange }: LeaveEncashmentDialogProps) {
  const { data: employee } = useCurrentEmployee()
  const { data: leaveTypes } = useLeaveTypes()
  const currentYear = new Date().getFullYear()
  const { data: balances } = useMyLeaveBalances(employee?.id || '', currentYear)
  const createEncashment = useCreateEncashmentRequest()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof encashmentSchema>, unknown, EncashmentFormData>({
    resolver: zodResolver(encashmentSchema),
  })

  const selectedTypeId = watch('leave_type_id')

  const selectedBalance = useMemo(() => {
    if (!selectedTypeId || !balances) return null
    return (balances as LeaveBalanceWithRelations[]).find((b) => b.leave_type_id === selectedTypeId) || null
  }, [selectedTypeId, balances])

  const available = selectedBalance ? getAvailableBalance(selectedBalance) : 0

  const paidLeaveTypes = useMemo(
    () => (leaveTypes || []).filter((lt) => lt.is_active && lt.is_paid),
    [leaveTypes]
  )

  const onSubmit = async (data: EncashmentFormData) => {
    if (!employee) return
    if (data.days_requested > available) {
      toast.error('Requested days exceed available balance')
      return
    }
    try {
      await createEncashment.mutateAsync({
        employee_id: employee.id,
        leave_type_id: data.leave_type_id,
        days_requested: data.days_requested,
        status: 'pending',
        period_year: currentYear,
        remarks: data.remarks || null,
      })
      toast.success('Encashment request submitted')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to submit encashment request')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle>Request Leave Encashment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Leave Type *</Label>
            <Select
              value={selectedTypeId}
              onValueChange={(v) => setValue('leave_type_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {paidLeaveTypes.map((lt) => (
                  <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.leave_type_id && <p className="text-sm text-destructive">{errors.leave_type_id.message}</p>}
            {selectedBalance && (
              <p className="text-xs text-muted-foreground">Available: {available} days</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="days_requested">Days to Encash *</Label>
            <Input
              id="days_requested"
              type="number"
              step="1"
              max={available}
              {...register('days_requested')}
            />
            {errors.days_requested && <p className="text-sm text-destructive">{errors.days_requested.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Input id="remarks" {...register('remarks')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEncashment.isPending}>
              {createEncashment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
