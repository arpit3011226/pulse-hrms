import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ACCRUAL_TYPES } from '@/lib/constants'
import { useLeaveTypes, useCreateLeavePolicy, useUpdateLeavePolicy } from '../hooks/use-leave'
import type { LeavePolicyWithDetails, LeavePolicyDetail } from '@/types/database.types'
import { toast } from 'sonner'

const policySchema = z.object({
  policy_name: z.string().min(1, 'Policy name is required'),
  policy_code: z.string().optional(),
  description: z.string().optional(),
})

type PolicyFormData = z.infer<typeof policySchema>

interface PolicyDetailRow {
  leave_type_id: string
  entitled_days: number
  max_consecutive_days: number | null
  min_days_per_request: number
  max_days_per_request: number | null
  allow_half_day: boolean
  allow_carry_forward: boolean
  max_carry_forward_days: number
  carry_forward_expiry_months: number | null
  accrual_type: 'yearly' | 'monthly' | 'quarterly'
  probation_applicable: boolean
  notice_days_required: number
}

const defaultDetail: Omit<PolicyDetailRow, 'leave_type_id'> = {
  entitled_days: 12,
  max_consecutive_days: null,
  min_days_per_request: 1,
  max_days_per_request: null,
  allow_half_day: true,
  allow_carry_forward: false,
  max_carry_forward_days: 0,
  carry_forward_expiry_months: null,
  accrual_type: 'yearly',
  probation_applicable: false,
  notice_days_required: 0,
}

interface LeavePolicyFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  policy?: LeavePolicyWithDetails
}

export function LeavePolicyFormDialog({ open, onOpenChange, policy }: LeavePolicyFormDialogProps) {
  const isEditing = !!policy
  const { data: leaveTypes } = useLeaveTypes()
  const createPolicy = useCreateLeavePolicy()
  const updatePolicy = useUpdateLeavePolicy()
  const [details, setDetails] = useState<PolicyDetailRow[]>([])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PolicyFormData>({
    resolver: zodResolver(policySchema),
    defaultValues: policy
      ? { policy_name: policy.policy_name, policy_code: policy.policy_code || '', description: policy.description || '' }
      : {},
  })

  // Load the policy into the editable rows once, when the dialog is opened for a
  // different policy. Doing this in an effect rendered the dialog empty first and
  // then again with the values.
  const [loadedPolicyId, setLoadedPolicyId] = useState<string | null | undefined>(undefined)
  const policyId = policy?.id ?? null
  if (policyId !== loadedPolicyId) {
    setLoadedPolicyId(policyId)
  if (policy?.leave_policy_details) {
        setDetails(
          policy.leave_policy_details.map((d) => ({
            leave_type_id: d.leave_type_id,
            entitled_days: d.entitled_days,
            max_consecutive_days: d.max_consecutive_days,
            min_days_per_request: d.min_days_per_request,
            max_days_per_request: d.max_days_per_request,
            allow_half_day: d.allow_half_day,
            allow_carry_forward: d.allow_carry_forward,
            max_carry_forward_days: d.max_carry_forward_days,
            carry_forward_expiry_months: d.carry_forward_expiry_months,
            accrual_type: d.accrual_type,
            probation_applicable: d.probation_applicable,
            notice_days_required: d.notice_days_required,
          }))
        )
      } else {
        setDetails([])
      }
      if (policy) {
        reset({
          policy_name: policy.policy_name,
          policy_code: policy.policy_code || '',
          description: policy.description || '',
        })
      } else {
        reset({ policy_name: '', policy_code: '', description: '' })
      }
  }

  const addDetail = () => {
    const usedTypeIds = details.map((d) => d.leave_type_id)
    const available = (leaveTypes || []).filter((lt) => lt.is_active && !usedTypeIds.includes(lt.id))
    if (available.length === 0) {
      toast.error('All leave types have been added')
      return
    }
    setDetails([...details, { leave_type_id: available[0].id, ...defaultDetail }])
  }

  const removeDetail = (index: number) => {
    setDetails(details.filter((_, i) => i !== index))
  }

  const updateDetail = (index: number, field: keyof PolicyDetailRow, value: unknown) => {
    setDetails(details.map((d, i) => (i === index ? { ...d, [field]: value } : d)))
  }

  const onSubmit = async (data: PolicyFormData) => {
    try {
      if (isEditing && policy) {
        await updatePolicy.mutateAsync({
          id: policy.id,
          policy: data,
          details: details.map((d) => ({
            ...d,
            is_active: true,
            accrual_start_from: new Date().toISOString().split('T')[0],
          })) as Partial<LeavePolicyDetail>[],
        })
        toast.success('Policy updated')
      } else {
        await createPolicy.mutateAsync({
          policy: { ...data, is_active: true },
          details: details.map((d) => ({
            ...d,
            is_active: true,
            accrual_start_from: new Date().toISOString().split('T')[0],
          })) as Partial<LeavePolicyDetail>[],
        })
        toast.success('Policy created')
      }
      onOpenChange(false)
      reset()
      setDetails([])
    } catch {
      toast.error('Failed to save policy')
    }
  }

  const isPending = createPolicy.isPending || updatePolicy.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Leave Policy' : 'Create Leave Policy'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-4">
              {/* Policy Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="policy_name">Policy Name *</Label>
                  <Input id="policy_name" {...register('policy_name')} placeholder="e.g., Standard Leave Policy" />
                  {errors.policy_name && <p className="text-sm text-destructive">{errors.policy_name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="policy_code">Policy Code</Label>
                  <Input id="policy_code" {...register('policy_code')} placeholder="e.g., STD-LP" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" {...register('description')} />
              </div>

              <Separator />

              {/* Leave Type Rules */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Leave Type Rules</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addDetail}>
                    <Plus className="mr-1 h-3 w-3" /> Add Leave Type
                  </Button>
                </div>

                {details.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No leave type rules added yet. Click "Add Leave Type" to configure rules.
                  </p>
                )}

                {details.map((detail, index) => (
                  <Card key={index}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Select
                          value={detail.leave_type_id}
                          onValueChange={(v) => updateDetail(index, 'leave_type_id', v)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select leave type" />
                          </SelectTrigger>
                          <SelectContent>
                            {(leaveTypes || [])
                              .filter((lt) => lt.is_active)
                              .map((lt) => (
                                <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeDetail(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Entitled Days</Label>
                          <Input
                            type="number"
                            step="0.5"
                            value={detail.entitled_days}
                            onChange={(e) => updateDetail(index, 'entitled_days', Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Min Days/Request</Label>
                          <Input
                            type="number"
                            step="0.5"
                            value={detail.min_days_per_request}
                            onChange={(e) => updateDetail(index, 'min_days_per_request', Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Max Days/Request</Label>
                          <Input
                            type="number"
                            step="0.5"
                            value={detail.max_days_per_request || ''}
                            onChange={(e) => updateDetail(index, 'max_days_per_request', e.target.value ? Number(e.target.value) : null)}
                            placeholder="No limit"
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Max Consecutive Days</Label>
                          <Input
                            type="number"
                            value={detail.max_consecutive_days || ''}
                            onChange={(e) => updateDetail(index, 'max_consecutive_days', e.target.value ? Number(e.target.value) : null)}
                            placeholder="No limit"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Accrual Type</Label>
                          <Select
                            value={detail.accrual_type}
                            onValueChange={(v) => updateDetail(index, 'accrual_type', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ACCRUAL_TYPES.map((a) => (
                                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Notice Days Required</Label>
                          <Input
                            type="number"
                            value={detail.notice_days_required}
                            onChange={(e) => updateDetail(index, 'notice_days_required', Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={detail.allow_half_day}
                            onCheckedChange={(v) => updateDetail(index, 'allow_half_day', v)}
                          />
                          <Label className="text-xs">Half Day</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={detail.allow_carry_forward}
                            onCheckedChange={(v) => updateDetail(index, 'allow_carry_forward', v)}
                          />
                          <Label className="text-xs">Carry Forward</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={detail.probation_applicable}
                            onCheckedChange={(v) => updateDetail(index, 'probation_applicable', v)}
                          />
                          <Label className="text-xs">During Probation</Label>
                        </div>
                      </div>

                      {detail.allow_carry_forward && (
                        <div className="grid gap-3 sm:grid-cols-2 pl-4">
                          <div className="space-y-1">
                            <Label className="text-xs">Max Carry Forward Days</Label>
                            <Input
                              type="number"
                              value={detail.max_carry_forward_days}
                              onChange={(e) => updateDetail(index, 'max_carry_forward_days', Number(e.target.value))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Expiry (months)</Label>
                            <Input
                              type="number"
                              value={detail.carry_forward_expiry_months || ''}
                              onChange={(e) => updateDetail(index, 'carry_forward_expiry_months', e.target.value ? Number(e.target.value) : null)}
                              placeholder="Never"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Policy' : 'Create Policy'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
