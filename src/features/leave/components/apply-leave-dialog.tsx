import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  useLeaveTypes,
  useMyLeaveBalances,
  useCurrentEmployee,
  useApplyLeave,
  useHolidayDates,
  useBlackoutPeriods,
} from '../hooks/use-leave'
import { calculateWorkingDays, generateLeaveRequestDays, isInBlackoutPeriod, getAvailableBalance } from '../utils/leave-utils'
import { HALF_DAY_OPTIONS } from '@/lib/constants'
import type { LeaveBalanceWithRelations } from '@/types/database.types'
import { toast } from 'sonner'

const applyLeaveSchema = z.object({
  leave_type_id: z.string().min(1, 'Select a leave type'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  reason: z.string().optional(),
  is_half_day: z.boolean().default(false),
  half_day_period: z.string().optional(),
})

type ApplyLeaveFormData = z.output<typeof applyLeaveSchema>

interface ApplyLeaveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ApplyLeaveDialog({ open, onOpenChange }: ApplyLeaveDialogProps) {
  const { organization } = useAuth()
  const { data: employee } = useCurrentEmployee()
  const { data: leaveTypes } = useLeaveTypes()
  const currentYear = new Date().getFullYear()
  const { data: balances } = useMyLeaveBalances(employee?.id || '', currentYear)
  const { data: blackoutPeriods } = useBlackoutPeriods()
  const applyLeave = useApplyLeave()

  const workingDays = useMemo(
    () => (organization?.settings as { working_days?: number[] })?.working_days || [1, 2, 3, 4, 5],
    [organization]
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof applyLeaveSchema>, unknown, ApplyLeaveFormData>({
    resolver: zodResolver(applyLeaveSchema),
    defaultValues: {
      is_half_day: false,
    },
  })

  const selectedTypeId = watch('leave_type_id')
  const startDate = watch('start_date')
  const endDate = watch('end_date')
  const isHalfDay = watch('is_half_day')

  // Get holiday dates for range
  const { data: holidayDates } = useHolidayDates(
    startDate || new Date().toISOString().split('T')[0],
    endDate || new Date().toISOString().split('T')[0]
  )

  // Calculate working days
  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0
    return calculateWorkingDays(startDate, endDate, workingDays, holidayDates || [], isHalfDay ?? false)
  }, [startDate, endDate, workingDays, holidayDates, isHalfDay])

  // Find balance for selected leave type
  const selectedBalance = useMemo(() => {
    if (!selectedTypeId || !balances) return null
    return (balances as LeaveBalanceWithRelations[]).find((b) => b.leave_type_id === selectedTypeId) || null
  }, [selectedTypeId, balances])

  const availableBalance = selectedBalance ? getAvailableBalance(selectedBalance) : 0

  // Check blackout period
  const blackoutMatch = useMemo(() => {
    if (!startDate || !endDate || !blackoutPeriods) return null
    return isInBlackoutPeriod(startDate, endDate, blackoutPeriods, selectedTypeId)
  }, [startDate, endDate, blackoutPeriods, selectedTypeId])

  // Half day forces same start/end date
  useEffect(() => {
    if (isHalfDay && startDate) {
      setValue('end_date', startDate)
    }
  }, [isHalfDay, startDate, setValue])

  const activeLeaveTypes = useMemo(
    () => (leaveTypes || []).filter((lt) => lt.is_active),
    [leaveTypes]
  )

  const onSubmit = async (data: ApplyLeaveFormData) => {
    if (!employee || !selectedBalance) {
      toast.error('Unable to apply leave. Please check your employee record and leave balance.')
      return
    }

    if (totalDays <= 0) {
      toast.error('Selected dates have no working days')
      return
    }

    if (totalDays > availableBalance) {
      toast.error('Insufficient leave balance')
      return
    }

    if (blackoutMatch) {
      toast.error(`Dates fall within blackout period: ${blackoutMatch.name}`)
      return
    }

    try {
      const days = generateLeaveRequestDays(
        data.start_date,
        data.end_date,
        workingDays,
        holidayDates || [],
        data.is_half_day,
        (data.half_day_period as 'first_half' | 'second_half') || null
      )

      await applyLeave.mutateAsync({
        request: {
          organization_id: organization!.id,
          employee_id: employee.id,
          leave_type_id: data.leave_type_id,
          start_date: data.start_date,
          end_date: data.end_date,
          total_days: totalDays,
          reason: data.reason || null,
          status: 'pending',
          is_half_day: data.is_half_day,
          half_day_period: data.is_half_day ? (data.half_day_period as 'first_half' | 'second_half') : null,
        },
        days: days.map((d) => ({ ...d, status: 'pending' })),
        balanceId: selectedBalance.id,
        currentPendingDays: selectedBalance.pending_days,
      })

      toast.success('Leave request submitted')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to submit leave request')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply for Leave</DialogTitle>
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
                {activeLeaveTypes.map((lt) => (
                  <SelectItem key={lt.id} value={lt.id}>
                    {lt.name}
                    {lt.code && ` (${lt.code})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.leave_type_id && <p className="text-sm text-destructive">{errors.leave_type_id.message}</p>}
            {selectedBalance && (
              <p className="text-xs text-muted-foreground">
                Available: {availableBalance} days (Total: {selectedBalance.total_days + selectedBalance.carried_forward_days}, Used: {selectedBalance.used_days}, Pending: {selectedBalance.pending_days})
              </p>
            )}
            {selectedTypeId && !selectedBalance && (
              <p className="text-xs text-amber-600">No balance record found for this leave type</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_half_day">Half Day Leave</Label>
            <Switch
              id="is_half_day"
              checked={isHalfDay}
              onCheckedChange={(v) => setValue('is_half_day', v)}
            />
          </div>

          {isHalfDay && (
            <div className="space-y-2">
              <Label>Period</Label>
              <Select
                value={watch('half_day_period') || ''}
                onValueChange={(v) => setValue('half_day_period', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {HALF_DAY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input id="start_date" type="date" {...register('start_date')} />
              {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                {...register('end_date')}
                disabled={isHalfDay}
                min={startDate}
              />
              {errors.end_date && <p className="text-sm text-destructive">{errors.end_date.message}</p>}
            </div>
          </div>

          {totalDays > 0 && (
            <p className="text-sm font-medium">
              Total: {totalDays} working day{totalDays !== 1 ? 's' : ''}
            </p>
          )}

          {blackoutMatch && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Blackout period: {blackoutMatch.name} ({blackoutMatch.start_date} to {blackoutMatch.end_date})</span>
            </div>
          )}

          {totalDays > availableBalance && selectedBalance && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Insufficient balance. Available: {availableBalance} days, Requested: {totalDays} days</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" {...register('reason')} placeholder="Optional reason for leave" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={applyLeave.isPending || !!blackoutMatch || (totalDays > availableBalance && !!selectedBalance)}
            >
              {applyLeave.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
