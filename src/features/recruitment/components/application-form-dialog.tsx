import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  useCandidates,
  useJobRequisitions,
  useCreateCandidateApplication,
} from '../hooks/use-recruitment'
import type { JobRequisitionWithRelations } from '@/types/database.types'
import { toast } from 'sonner'

const applicationSchema = z.object({
  candidate_id: z.string().min(1, 'Candidate is required'),
  job_requisition_id: z.string().min(1, 'Job requisition is required'),
  applied_date: z.string().min(1, 'Applied date is required'),
})

type ApplicationFormData = z.infer<typeof applicationSchema>

interface ApplicationFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ApplicationFormDialog({ open, onOpenChange }: ApplicationFormDialogProps) {
  const createApplication = useCreateCandidateApplication()
  const { data: candidates } = useCandidates()
  const { data: requisitions } = useJobRequisitions()

  const openRequisitions = ((requisitions || []) as JobRequisitionWithRelations[]).filter(
    (r) => r.status === 'open'
  )

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema) as any,
    defaultValues: {
      candidate_id: '',
      job_requisition_id: '',
      applied_date: new Date().toISOString().split('T')[0],
    },
  })

  const candidateId = watch('candidate_id')
  const requisitionId = watch('job_requisition_id')

  useEffect(() => {
    if (open) {
      reset({
        candidate_id: '',
        job_requisition_id: '',
        applied_date: new Date().toISOString().split('T')[0],
      })
    }
  }, [open, reset])

  const onSubmit = async (data: ApplicationFormData) => {
    try {
      await createApplication.mutateAsync({
        candidate_id: data.candidate_id,
        job_requisition_id: data.job_requisition_id,
        applied_date: data.applied_date,
        status: 'new',
      })
      toast.success('Application created')
      onOpenChange(false)
    } catch {
      toast.error('Failed to create application')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Application</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Candidate *</Label>
            <Select value={candidateId} onValueChange={(v) => setValue('candidate_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select candidate" />
              </SelectTrigger>
              <SelectContent>
                {(candidates || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} - {c.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.candidate_id && <p className="text-sm text-destructive">{errors.candidate_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Job Requisition *</Label>
            <Select value={requisitionId} onValueChange={(v) => setValue('job_requisition_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select requisition" />
              </SelectTrigger>
              <SelectContent>
                {openRequisitions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.requisition_code || 'N/A'} - {r.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.job_requisition_id && <p className="text-sm text-destructive">{errors.job_requisition_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="applied_date">Applied Date *</Label>
            <Input id="applied_date" type="date" {...register('applied_date')} />
            {errors.applied_date && <p className="text-sm text-destructive">{errors.applied_date.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createApplication.isPending}>
              {createApplication.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Application
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
