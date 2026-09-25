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
import { INTERVIEW_MODES } from '@/lib/constants'
import {
  useCreateInterview,
  useUpdateInterview,
  useCandidateApplications,
  useInterviewStages,
} from '../hooks/use-recruitment'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import type { InterviewWithRelations } from '@/types/database.types'
import { toast } from 'sonner'

const interviewSchema = z.object({
  candidate_application_id: z.string().min(1, 'Application is required'),
  interview_stage_id: z.string().min(1, 'Interview stage is required'),
  interviewer_id: z.string().min(1, 'Interviewer is required'),
  scheduled_start: z.string().min(1, 'Start time is required'),
  scheduled_end: z.string().min(1, 'End time is required'),
  mode: z.string().min(1, 'Mode is required'),
  location_or_link: z.string().optional(),
  notes: z.string().optional(),
})

type InterviewFormData = z.infer<typeof interviewSchema>

interface InterviewFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  interview?: InterviewWithRelations
}

export function InterviewFormDialog({ open, onOpenChange, interview }: InterviewFormDialogProps) {
  const isEditing = !!interview
  const { organization } = useAuth()
  const createInterview = useCreateInterview()
  const updateInterview = useUpdateInterview()

  const { data: applications } = useCandidateApplications()
  const { data: stages } = useInterviewStages()

  const { data: employees } = useQuery({
    queryKey: ['employees-list', organization?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('organization_id', organization!.id)
        .eq('status', 'active')
        .order('first_name')
      return data || []
    },
    enabled: !!organization?.id,
  })

  const eligibleApplications = (applications || []).filter(
    (a) => ['new', 'screening', 'in_progress'].includes(a.status)
  )

  const activeStages = (stages || []).filter((s) => s.is_active)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InterviewFormData>({
    resolver: zodResolver(interviewSchema),
    defaultValues: {
      candidate_application_id: '',
      interview_stage_id: '',
      interviewer_id: '',
      scheduled_start: '',
      scheduled_end: '',
      mode: 'video',
      location_or_link: '',
      notes: '',
    },
  })

  const applicationId = watch('candidate_application_id')
  const stageId = watch('interview_stage_id')
  const interviewerId = watch('interviewer_id')
  const mode = watch('mode')

  function toDatetimeLocal(isoStr: string) {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    const offset = d.getTimezoneOffset()
    const local = new Date(d.getTime() - offset * 60000)
    return local.toISOString().slice(0, 16)
  }

  useEffect(() => {
    if (interview) {
      reset({
        candidate_application_id: interview.candidate_application_id,
        interview_stage_id: interview.interview_stage_id || '',
        interviewer_id: interview.interviewer_id || '',
        scheduled_start: toDatetimeLocal(interview.scheduled_start),
        scheduled_end: toDatetimeLocal(interview.scheduled_end),
        mode: interview.mode || 'video',
        location_or_link: interview.location_or_link || '',
        notes: interview.notes || '',
      })
    } else {
      reset({
        candidate_application_id: '',
        interview_stage_id: '',
        interviewer_id: '',
        scheduled_start: '',
        scheduled_end: '',
        mode: 'video',
        location_or_link: '',
        notes: '',
      })
    }
  }, [interview, reset])

  const onSubmit = async (data: InterviewFormData) => {
    try {
      const payload = {
        candidate_application_id: data.candidate_application_id,
        interview_stage_id: data.interview_stage_id,
        interviewer_id: data.interviewer_id,
        scheduled_start: new Date(data.scheduled_start).toISOString(),
        scheduled_end: new Date(data.scheduled_end).toISOString(),
        mode: data.mode as 'phone' | 'video' | 'in_person',
        location_or_link: data.location_or_link || undefined,
        notes: data.notes || undefined,
      }

      if (isEditing && interview) {
        await updateInterview.mutateAsync({ id: interview.id, ...payload })
        toast.success('Interview updated')
      } else {
        await createInterview.mutateAsync(payload)
        toast.success('Interview scheduled')
      }
      onOpenChange(false)
    } catch {
      toast.error('Failed to save interview')
    }
  }

  const isPending = createInterview.isPending || updateInterview.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Interview' : 'Schedule Interview'}</DialogTitle>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Interview Stage *</Label>
                  <Select value={stageId} onValueChange={(v) => setValue('interview_stage_id', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeStages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.stage_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.interview_stage_id && (
                    <p className="text-sm text-destructive">{errors.interview_stage_id.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Interviewer *</Label>
                  <Select value={interviewerId} onValueChange={(v) => setValue('interviewer_id', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select interviewer" />
                    </SelectTrigger>
                    <SelectContent>
                      {(employees || []).map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.interviewer_id && (
                    <p className="text-sm text-destructive">{errors.interviewer_id.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="scheduled_start">Start Date & Time *</Label>
                  <Input
                    id="scheduled_start"
                    type="datetime-local"
                    {...register('scheduled_start')}
                  />
                  {errors.scheduled_start && (
                    <p className="text-sm text-destructive">{errors.scheduled_start.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduled_end">End Date & Time *</Label>
                  <Input
                    id="scheduled_end"
                    type="datetime-local"
                    {...register('scheduled_end')}
                  />
                  {errors.scheduled_end && (
                    <p className="text-sm text-destructive">{errors.scheduled_end.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Mode *</Label>
                  <Select value={mode} onValueChange={(v) => setValue('mode', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERVIEW_MODES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.mode && (
                    <p className="text-sm text-destructive">{errors.mode.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location_or_link">Location / Meeting Link</Label>
                  <Input
                    id="location_or_link"
                    {...register('location_or_link')}
                    placeholder={mode === 'video' ? 'https://meet.google.com/...' : 'Office address or room'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  rows={3}
                  placeholder="Additional notes for the interview..."
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
              {isEditing ? 'Update Interview' : 'Schedule Interview'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
