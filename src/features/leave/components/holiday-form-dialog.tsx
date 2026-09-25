import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HOLIDAY_TYPES } from '@/lib/constants'
import type { Holiday } from '@/types/database.types'

const holidaySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  date: z.string().min(1, 'Date is required'),
  type: z.string().min(1, 'Type is required'),
  // F53 — blank means it applies everywhere. One list breaks the moment there
  // is a second city: Bengaluru and Delhi do not share every festival.
  location: z.string().optional(),
  is_optional: z.boolean().optional(),
})

type HolidayFormData = z.infer<typeof holidaySchema>

interface HolidayFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  holiday?: Holiday
  onSave: (data: HolidayFormData) => Promise<void>
  isLoading?: boolean
}

export function HolidayFormDialog({ open, onOpenChange, holiday, onSave, isLoading }: HolidayFormDialogProps) {
  const isEditing = !!holiday

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<HolidayFormData>({
    resolver: zodResolver(holidaySchema),
    defaultValues: holiday
      ? { name: holiday.name, date: holiday.date, type: holiday.type }
      : { type: 'public' },
  })

  const onSubmit = async (data: HolidayFormData) => {
    await onSave(data)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Holiday Name *</Label>
            <Input id="name" {...register('name')} placeholder="e.g., Republic Day" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input id="date" type="date" {...register('date')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Leave blank to apply everywhere"
              {...register('location')}
            />
            <p className="text-xs text-muted-foreground">
              e.g. Bengaluru. Blank means the whole company.
            </p>
            {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Type *</Label>
            <Select
              value={watch('type')}
              onValueChange={(v) => setValue('type', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {HOLIDAY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
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
