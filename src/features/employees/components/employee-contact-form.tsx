import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RELATIONSHIP_TYPES } from '@/lib/constants'
import { useCreateEmergencyContact, useUpdateEmergencyContact } from '../hooks/use-employee-lifecycle'
import type { EmployeeEmergencyContact } from '@/types/database.types'
import { toast } from 'sonner'

const contactSchema = z.object({
  contact_name: z.string().min(1, 'Name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email().optional().or(z.literal('')),
  priority_order: z.number().min(1).optional(),
})

type ContactFormData = z.infer<typeof contactSchema>

interface EmployeeContactFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
  contact?: EmployeeEmergencyContact
}

export function EmployeeContactForm({ open, onOpenChange, employeeId, contact }: EmployeeContactFormProps) {
  const isEditing = !!contact
  const createContact = useCreateEmergencyContact()
  const updateContact = useUpdateEmergencyContact()

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: contact ? {
      contact_name: contact.contact_name,
      relationship: contact.relationship,
      phone: contact.phone,
      email: contact.email || '',
      priority_order: contact.priority_order,
    } : {
      priority_order: 1,
    },
  })

  const onSubmit = async (data: ContactFormData) => {
    try {
      const cleaned = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
      )
      if (isEditing) {
        await updateContact.mutateAsync({ id: contact.id, ...cleaned })
        toast.success('Contact updated')
      } else {
        await createContact.mutateAsync({ ...cleaned, employee_id: employeeId })
        toast.success('Contact added')
      }
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to save contact')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Emergency Contact' : 'Add Emergency Contact'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact_name">Contact Name *</Label>
            <Input id="contact_name" {...register('contact_name')} />
            {errors.contact_name && <p className="text-sm text-destructive">{errors.contact_name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Relationship *</Label>
            <Select onValueChange={(v) => setValue('relationship', v)} defaultValue={contact?.relationship}>
              <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.relationship && <p className="text-sm text-destructive">{errors.relationship.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" {...register('phone')} />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority_order">Priority</Label>
            <Input id="priority_order" type="number" min={1} max={10} {...register('priority_order', { valueAsNumber: true })} />
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
