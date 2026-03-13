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
})

type LeaveTypeFormData = z.infer<typeof leaveTypeSchema>

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
  } = useForm<LeaveTypeFormData>({
    resolver: zodResolver(leaveTypeSchema) as any,
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
        }
      : {
          default_days: 12,
          is_paid: true,
          is_carry_forward: false,
          max_carry_forward_days: 0,
          document_required_flag: false,
          gender_specific_flag: false,
        },
  })

  const isCarryForward = watch('is_carry_forward')
  const isGenderSpecific = watch('gender_specific_flag')

  const onSubmit = async (data: LeaveTypeFormData) => {
    await onSave(data)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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
