import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { GENDER_OPTIONS } from '@/lib/constants'
import type { LeaveType } from '@/types/database.types'

const leaveTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional(),
  leave_code: z.string().optional(),
  description: z.string().optional(),
  default_days: z.coerce.number().min(0.5, 'Minimum 0.5 days'),
  is_carry_forward: z.boolean().default(false),
  max_carry_forward_days: z.coerce.number().min(0).default(0),
  is_paid: z.boolean().default(true),
  applicable_gender: z.string().optional(),
  document_required_flag: z.boolean().default(false),
  gender_specific_flag: z.boolean().default(false),
  accrual_frequency: z.string().default('yearly'),
  monthly_credit_amount: z.coerce.number().min(0).optional().nullable(),
  is_regional: z.boolean().default(false),
  applicable_region: z.string().optional(),
  max_leaves_per_month: z.coerce.number().min(0).optional().nullable(),
  is_use_it_or_lose_it: z.boolean().default(false),
})

type LeaveTypeFormData = z.output<typeof leaveTypeSchema>

interface LeaveTypeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leaveType?: LeaveType
  onSave: (data: LeaveTypeFormData) => Promise<void>
  isLoading?: boolean
}

export function LeaveTypeFormDialog({
  open,
  onOpenChange,
  leaveType,
  onSave,
  isLoading,
}: LeaveTypeFormDialogProps) {
  const isEditing = !!leaveType

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof leaveTypeSchema>, unknown, LeaveTypeFormData>({
    resolver: zodResolver(leaveTypeSchema),
    defaultValues: leaveType
      ? {
          name: leaveType.name,
          code: leaveType.code || '',
          leave_code: leaveType.leave_code || '',
          description: leaveType.description || '',
          default_days: leaveType.default_days,
          is_carry_forward: leaveType.is_carry_forward,
          max_carry_forward_days: leaveType.max_carry_forward_days,
          is_paid: leaveType.is_paid,
          applicable_gender: leaveType.applicable_gender || '',
          document_required_flag: leaveType.document_required_flag,
          gender_specific_flag: leaveType.gender_specific_flag,
          accrual_frequency: leaveType.accrual_frequency || 'yearly',
          monthly_credit_amount: leaveType.monthly_credit_amount ?? undefined,
          is_regional: leaveType.is_regional || false,
          applicable_region: leaveType.applicable_region || '',
          max_leaves_per_month: leaveType.max_leaves_per_month ?? undefined,
          is_use_it_or_lose_it: leaveType.is_use_it_or_lose_it || false,
        }
      : {
          default_days: 12,
          is_paid: true,
          is_carry_forward: false,
          max_carry_forward_days: 0,
          document_required_flag: false,
          gender_specific_flag: false,
          accrual_frequency: 'yearly',
          monthly_credit_amount: undefined,
          is_regional: false,
          applicable_region: '',
          max_leaves_per_month: undefined,
          is_use_it_or_lose_it: false,
        },
  })

  const isCarryForward = watch('is_carry_forward')
  const isGenderSpecific = watch('gender_specific_flag')
  const accrualFrequency = watch('accrual_frequency')
  const isRegional = watch('is_regional')

  const onSubmit = async (data: LeaveTypeFormData) => {
    await onSave(data)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Leave Type' : 'Add Leave Type'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name')} placeholder="e.g., Casual Leave" />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" {...register('code')} placeholder="e.g., CL" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register('description')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="default_days">Default Days *</Label>
              <Input id="default_days" type="number" step="0.5" {...register('default_days')} />
              {errors.default_days && <p className="text-sm text-destructive">{errors.default_days.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave_code">Leave Code</Label>
              <Input id="leave_code" {...register('leave_code')} placeholder="e.g., LV-CL" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="is_paid">Paid Leave</Label>
              <Switch
                id="is_paid"
                checked={watch('is_paid')}
                onCheckedChange={(v) => setValue('is_paid', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="document_required_flag">Document Required</Label>
              <Switch
                id="document_required_flag"
                checked={watch('document_required_flag')}
                onCheckedChange={(v) => setValue('document_required_flag', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_carry_forward">Allow Carry Forward</Label>
              <Switch
                id="is_carry_forward"
                checked={isCarryForward}
                onCheckedChange={(v) => setValue('is_carry_forward', v)}
              />
            </div>

            {isCarryForward && (
              <div className="space-y-2 pl-4">
                <Label htmlFor="max_carry_forward_days">Max Carry Forward Days</Label>
                <Input id="max_carry_forward_days" type="number" step="0.5" {...register('max_carry_forward_days')} />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="gender_specific_flag">Gender Specific</Label>
              <Switch
                id="gender_specific_flag"
                checked={isGenderSpecific}
                onCheckedChange={(v) => setValue('gender_specific_flag', v)}
              />
            </div>

            {isGenderSpecific && (
              <div className="space-y-2 pl-4">
                <Label>Applicable Gender</Label>
                <Select
                  onValueChange={(v) => setValue('applicable_gender', v)}
                  defaultValue={leaveType?.applicable_gender || undefined}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="is_regional">Regional Leave</Label>
              <Switch
                id="is_regional"
                checked={isRegional}
                onCheckedChange={(v) => setValue('is_regional', v)}
              />
            </div>

            {isRegional && (
              <div className="space-y-2 pl-4">
                <Label htmlFor="applicable_region">Applicable Region</Label>
                <Input id="applicable_region" {...register('applicable_region')} placeholder="e.g., Karnataka, Tamil Nadu" />
              </div>
            )}
          </div>

          {/* Accrual Configuration */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Accrual Frequency</Label>
              <Select
                onValueChange={(v) => setValue('accrual_frequency', v)}
                defaultValue={leaveType?.accrual_frequency || 'yearly'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yearly">Yearly (credited at start of year)</SelectItem>
                  <SelectItem value="monthly">Monthly (credited each month)</SelectItem>
                  <SelectItem value="quarterly">Quarterly (credited each quarter)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {accrualFrequency === 'monthly' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="monthly_credit_amount">Monthly Credit Amount (days)</Label>
                  <Input
                    id="monthly_credit_amount"
                    type="number"
                    step="0.5"
                    placeholder="e.g., 1.5"
                    {...register('monthly_credit_amount')}
                  />
                  <p className="text-xs text-muted-foreground">Days credited per month. Leave blank to auto-calculate from default days ÷ 12.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_leaves_per_month">Max Leaves Per Month</Label>
                  <Input
                    id="max_leaves_per_month"
                    type="number"
                    step="0.5"
                    placeholder="e.g., 1"
                    {...register('max_leaves_per_month')}
                  />
                  <p className="text-xs text-muted-foreground">Maximum leaves that can be applied in a single month. Leave blank for no limit.</p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="is_use_it_or_lose_it">Use It or Lose It</Label>
                    <p className="text-xs text-muted-foreground">Unused monthly credit expires at end of month (not accumulated)</p>
                  </div>
                  <Switch
                    id="is_use_it_or_lose_it"
                    checked={watch('is_use_it_or_lose_it')}
                    onCheckedChange={(v) => setValue('is_use_it_or_lose_it', v)}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
