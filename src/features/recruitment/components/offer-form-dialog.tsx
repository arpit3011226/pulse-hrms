import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useCreateOfferLetter,
  useUpdateOfferLetter,
  useCandidateApplications,
} from '../hooks/use-recruitment'
import type { OfferLetterWithRelations } from '@/types/database.types'
import { toast } from 'sonner'

const offerSchema = z.object({
  candidate_application_id: z.string().min(1, 'Application is required'),
  offered_designation: z.string().min(1, 'Designation is required'),
  offered_ctc: z.coerce.number().min(1, 'CTC must be greater than 0'),
  joining_date: z.string().optional(),
  valid_until: z.string().optional(),
  offer_notes: z.string().optional(),
})

type OfferFormData = z.output<typeof offerSchema>

interface OfferFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  offer?: OfferLetterWithRelations
}

export function OfferFormDialog({ open, onOpenChange, offer }: OfferFormDialogProps) {
  const isEditing = !!offer
  const createOffer = useCreateOfferLetter()
  const updateOffer = useUpdateOfferLetter()

  const { data: applications } = useCandidateApplications()

  const eligibleApplications = (applications || []).filter(
    (a) => ['new', 'in_progress', 'offer'].includes(a.status)
  )

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.input<typeof offerSchema>, unknown, OfferFormData>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      candidate_application_id: '',
      offered_designation: '',
      offered_ctc: 0,
      joining_date: '',
      valid_until: '',
      offer_notes: '',
    },
  })

  const applicationId = watch('candidate_application_id')

  useEffect(() => {
    if (offer) {
      reset({
        candidate_application_id: offer.candidate_application_id,
        offered_designation: offer.offered_designation || '',
        offered_ctc: offer.offered_ctc || 0,
        joining_date: offer.joining_date || '',
        valid_until: offer.valid_until || '',
        offer_notes: offer.offer_notes || '',
      })
    } else {
      reset({
        candidate_application_id: '',
        offered_designation: '',
        offered_ctc: 0,
        joining_date: '',
        valid_until: '',
        offer_notes: '',
      })
    }
  }, [offer, reset])

  const onSubmit = async (data: OfferFormData) => {
    try {
      const payload = {
        candidate_application_id: data.candidate_application_id,
        offered_designation: data.offered_designation,
        offered_ctc: data.offered_ctc,
        joining_date: data.joining_date || undefined,
        valid_until: data.valid_until || undefined,
        offer_notes: data.offer_notes || undefined,
      }

      if (isEditing && offer) {
        await updateOffer.mutateAsync({ id: offer.id, ...payload })
        toast.success('Offer letter updated')
      } else {
        await createOffer.mutateAsync(payload)
        toast.success('Offer letter created')
      }
      onOpenChange(false)
    } catch {
      toast.error('Failed to save offer letter')
    }
  }

  const isPending = createOffer.isPending || updateOffer.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Offer Letter' : 'Create Offer Letter'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label>Candidate Application *</Label>
                <Select value={applicationId} onValueChange={(v) => setValue('candidate_application_id', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select application" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleApplications.map((app) => {
                      const cand = app.candidate
                      const job = app.job_requisition
                      const label = cand && job
                        ? `${cand.first_name} ${cand.last_name} - ${job.title}`
                        : app.id
                      return (
                        <SelectItem key={app.id} value={app.id}>
                          {label}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {errors.candidate_application_id && (
                  <p className="text-sm text-destructive">{errors.candidate_application_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="offered_designation">Offered Designation *</Label>
                <Input
                  id="offered_designation"
                  {...register('offered_designation')}
                  placeholder="e.g., Senior Software Engineer"
                />
                {errors.offered_designation && (
                  <p className="text-sm text-destructive">{errors.offered_designation.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="offered_ctc">Offered CTC *</Label>
                <Input
                  id="offered_ctc"
                  type="number"
                  min={0}
                  {...register('offered_ctc')}
                  placeholder="Annual CTC amount"
                />
                {errors.offered_ctc && (
                  <p className="text-sm text-destructive">{errors.offered_ctc.message}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="joining_date">Joining Date</Label>
                  <Input id="joining_date" type="date" {...register('joining_date')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valid_until">Valid Until</Label>
                  <Input id="valid_until" type="date" {...register('valid_until')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="offer_notes">Offer Notes</Label>
                <Textarea
                  id="offer_notes"
                  {...register('offer_notes')}
                  rows={3}
                  placeholder="Additional notes about this offer..."
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Offer' : 'Create Offer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
