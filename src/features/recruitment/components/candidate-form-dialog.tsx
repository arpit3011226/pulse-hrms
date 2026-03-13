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
import { CANDIDATE_SOURCES } from '@/lib/constants'
import { useCreateCandidate, useUpdateCandidate } from '../hooks/use-recruitment'
import type { Candidate } from '@/types/database.types'
import { toast } from 'sonner'

const candidateSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  phone: z.string().optional(),
  current_company: z.string().optional(),
  current_designation: z.string().optional(),
  experience_years: z.coerce.number().min(0).optional().or(z.literal('')),
  source: z.string().min(1, 'Source is required'),
  resume_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  notes: z.string().optional(),
})

type CandidateFormData = z.infer<typeof candidateSchema>

interface CandidateFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidate?: Candidate
}

export function CandidateFormDialog({ open, onOpenChange, candidate }: CandidateFormDialogProps) {
  const isEditing = !!candidate
  const createCandidate = useCreateCandidate()
  const updateCandidate = useUpdateCandidate()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CandidateFormData>({
    resolver: zodResolver(candidateSchema) as any,
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      current_company: '',
      current_designation: '',
      experience_years: '',
      source: 'direct',
      resume_url: '',
      notes: '',
    },
  })

  const source = watch('source')

  useEffect(() => {
    if (candidate) {
      reset({
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        email: candidate.email,
        phone: candidate.phone || '',
        current_company: candidate.current_company || '',
        current_designation: candidate.current_designation || '',
        experience_years: candidate.experience_years ?? '',
        source: candidate.source || 'direct',
        resume_url: candidate.resume_url || '',
        notes: candidate.notes || '',
      })
    } else {
      reset({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        current_company: '',
        current_designation: '',
        experience_years: '',
        source: 'direct',
        resume_url: '',
        notes: '',
      })
    }
  }, [candidate, reset])

  const onSubmit = async (data: CandidateFormData) => {
    try {
      const payload = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone || undefined,
        current_company: data.current_company || undefined,
        current_designation: data.current_designation || undefined,
        experience_years: data.experience_years !== '' ? Number(data.experience_years) : undefined,
        source: data.source as Candidate['source'],
        resume_url: data.resume_url || undefined,
        notes: data.notes || undefined,
      }

      if (isEditing && candidate) {
        await updateCandidate.mutateAsync({ id: candidate.id, ...payload })
        toast.success('Candidate updated')
      } else {
        await createCandidate.mutateAsync(payload)
        toast.success('Candidate created')
      }
      onOpenChange(false)
    } catch {
      toast.error('Failed to save candidate')
    }
  }

  const isPending = createCandidate.isPending || updateCandidate.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Candidate' : 'Add Candidate'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input id="first_name" {...register('first_name')} placeholder="e.g., John" />
                  {errors.first_name && <p className="text-sm text-destructive">{errors.first_name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input id="last_name" {...register('last_name')} placeholder="e.g., Doe" />
                  {errors.last_name && <p className="text-sm text-destructive">{errors.last_name.message}</p>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" {...register('email')} placeholder="john@example.com" />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...register('phone')} placeholder="+91 98765 43210" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="current_company">Current Company</Label>
                  <Input id="current_company" {...register('current_company')} placeholder="e.g., Acme Corp" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current_designation">Current Designation</Label>
                  <Input id="current_designation" {...register('current_designation')} placeholder="e.g., Senior Developer" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="experience_years">Experience (years)</Label>
                  <Input id="experience_years" type="number" min={0} step={0.5} {...register('experience_years')} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Source *</Label>
                  <Select value={source} onValueChange={(v) => setValue('source', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {CANDIDATE_SOURCES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.source && <p className="text-sm text-destructive">{errors.source.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resume_url">Resume URL</Label>
                <Input id="resume_url" {...register('resume_url')} placeholder="https://example.com/resume.pdf" />
                {errors.resume_url && <p className="text-sm text-destructive">{errors.resume_url.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" {...register('notes')} rows={3} placeholder="Any additional notes about the candidate..." />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Candidate' : 'Add Candidate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
