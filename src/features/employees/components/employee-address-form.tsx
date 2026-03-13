import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ADDRESS_TYPES } from '@/lib/constants'
import { useCreateAddress, useUpdateAddress } from '../hooks/use-employee-lifecycle'
import type { EmployeeAddress } from '@/types/database.types'
import { toast } from 'sonner'

const addressSchema = z.object({
  address_type: z.string().min(1, 'Address type is required'),
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
  is_primary: z.boolean().optional(),
})

type AddressFormData = z.infer<typeof addressSchema>

interface EmployeeAddressFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
  address?: EmployeeAddress
}

export function EmployeeAddressForm({ open, onOpenChange, employeeId, address }: EmployeeAddressFormProps) {
  const isEditing = !!address
  const createAddress = useCreateAddress()
  const updateAddress = useUpdateAddress()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: address ? {
      address_type: address.address_type,
      line1: address.line1,
      line2: address.line2 || '',
      city: address.city,
      state: address.state || '',
      country: address.country || 'India',
      pincode: address.pincode || '',
      is_primary: address.is_primary,
    } : {
      country: 'India',
      is_primary: false,
    },
  })

  const onSubmit = async (data: AddressFormData) => {
    try {
      const cleaned = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
      )
      if (isEditing) {
        await updateAddress.mutateAsync({ id: address.id, ...cleaned })
        toast.success('Address updated')
      } else {
        await createAddress.mutateAsync({ ...cleaned, employee_id: employeeId })
        toast.success('Address added')
      }
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to save address')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Address' : 'Add Address'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Address Type *</Label>
            <Select onValueChange={(v) => setValue('address_type', v)} defaultValue={address?.address_type}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {ADDRESS_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.address_type && <p className="text-sm text-destructive">{errors.address_type.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="line1">Address Line 1 *</Label>
            <Input id="line1" {...register('line1')} />
            {errors.line1 && <p className="text-sm text-destructive">{errors.line1.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="line2">Address Line 2</Label>
            <Input id="line2" {...register('line2')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input id="city" {...register('city')} />
              {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" {...register('state')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register('country')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input id="pincode" {...register('pincode')} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={watch('is_primary')}
              onCheckedChange={(v) => setValue('is_primary', v)}
            />
            <Label>Primary Address</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
