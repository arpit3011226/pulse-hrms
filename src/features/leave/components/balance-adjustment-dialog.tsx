import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAdjustLeaveBalance } from '../hooks/use-leave'
import { toast } from 'sonner'

const adjustmentSchema = z.object({
  total_days: z.coerce.number().min(0),
  used_days: z.coerce.number().min(0),
  pending_days: z.coerce.number().min(0),
})

type AdjustmentFormData = z.output<typeof adjustmentSchema>

interface BalanceAdjustmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  balanceId: string
  employeeName: string
  leaveTypeName: string
  currentValues: { total_days: number; used_days: number; pending_days: number }
}

export function BalanceAdjustmentDialog({
  open,
  onOpenChange,
  balanceId,
  employeeName,
  leaveTypeName,
  currentValues,
}: BalanceAdjustmentDialogProps) {
  const adjustBalance = useAdjustLeaveBalance()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof adjustmentSchema>, unknown, AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: currentValues,
  })

  const onSubmit = async (data: AdjustmentFormData) => {
    try {
      await adjustBalance.mutateAsync({ id: balanceId, adjustments: data })
      toast.success('Balance adjusted')
      onOpenChange(false)
    } catch {
      toast.error('Failed to adjust balance')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Leave Balance</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {employeeName} - {leaveTypeName}
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="total_days">Total Days</Label>
            <Input id="total_days" type="number" step="0.5" {...register('total_days')} />
            {errors.total_days && <p className="text-sm text-destructive">{errors.total_days.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="used_days">Used Days</Label>
            <Input id="used_days" type="number" step="0.5" {...register('used_days')} />
            {errors.used_days && <p className="text-sm text-destructive">{errors.used_days.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pending_days">Pending Days</Label>
            <Input id="pending_days" type="number" step="0.5" {...register('pending_days')} />
            {errors.pending_days && <p className="text-sm text-destructive">{errors.pending_days.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={adjustBalance.isPending}>
              {adjustBalance.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
