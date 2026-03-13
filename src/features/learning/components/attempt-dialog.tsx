import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { ATTEMPT_STATUSES } from '@/lib/constants'
import { useCreateAttempt } from '../hooks/use-learning'
import type { TrainingAssessment } from '@/types/database.types'
import { toast } from 'sonner'

const schema = z.object({
  employee_id: z.string().min(1, 'Employee is required'),
  score: z.coerce.number().min(0),
  status: z.string().min(1, 'Status is required'),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  assessment: TrainingAssessment | null
}

export function AttemptDialog({ open, onOpenChange, assessment }: Props) {
  const { organization } = useAuth()
  const createAttempt = useCreateAttempt()

  const { data: employees } = useQuery({
    queryKey: ['employees-list', organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_code')
        .eq('organization_id', organization!.id)
        .eq('status', 'active')
        .order('first_name')
      if (error) throw error
      return data
    },
    enabled: !!organization?.id && open,
  })

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { employee_id: '', score: 0, status: 'passed' },
  })

  useEffect(() => {
    if (open) {
      form.reset({ employee_id: '', score: 0, status: 'passed' })
    }
  }, [open])

  const onSubmit = async (data: FormData) => {
    if (!assessment) return
    try {
      const status = data.score >= assessment.passing_marks ? 'passed' : 'failed'
      await createAttempt.mutateAsync({
        assessment_id: assessment.id,
        employee_id: data.employee_id,
        score: data.score,
        status,
        completed_at: new Date().toISOString(),
      })
      toast.success(`Attempt recorded (${status})`)
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to record attempt')
    }
  }

  if (!assessment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Attempt: {assessment.assessment_name}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Total: {assessment.total_marks} | Passing: {assessment.passing_marks}
        </p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Employee *</Label>
            <Select
              value={form.watch('employee_id')}
              onValueChange={(v) => form.setValue('employee_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {(employees ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.first_name} {e.last_name} ({e.employee_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.employee_id && (
              <p className="mt-1 text-sm text-destructive">{form.formState.errors.employee_id.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="score">Score *</Label>
            <Input id="score" type="number" {...form.register('score')} max={assessment.total_marks} />
            {form.formState.errors.score && (
              <p className="mt-1 text-sm text-destructive">{form.formState.errors.score.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createAttempt.isPending}>
              {createAttempt.isPending ? 'Recording...' : 'Record Attempt'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
