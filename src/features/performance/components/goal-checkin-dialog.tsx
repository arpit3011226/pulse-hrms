import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCreateGoalCheckin, useGoalCheckins } from '../hooks/use-performance'
import { formatDate } from '@/lib/utils'
import type { EmployeeGoal } from '@/types/database.types'
import { toast } from 'sonner'

const checkinSchema = z.object({
  progress_value: z.coerce.number().min(0, 'Progress must be at least 0'),
  comments: z.string().optional(),
  checkin_date: z.string().min(1, 'Check-in date is required'),
})

type CheckinFormData = z.output<typeof checkinSchema>

interface GoalCheckinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: EmployeeGoal
}

export function GoalCheckinDialog({ open, onOpenChange, goal }: GoalCheckinDialogProps) {
  const createCheckin = useCreateGoalCheckin()
  const { data: checkins } = useGoalCheckins(goal.id)

  const today = new Date().toISOString().split('T')[0]

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof checkinSchema>, unknown, CheckinFormData>({
    resolver: zodResolver(checkinSchema),
    defaultValues: {
      progress_value: goal.current_value,
      comments: '',
      checkin_date: today,
    },
  })

  const onSubmit = async (data: CheckinFormData) => {
    try {
      await createCheckin.mutateAsync({
        employee_goal_id: goal.id,
        progress_value: data.progress_value,
        comments: data.comments || null,
        checkin_date: data.checkin_date,
      } as any)
      toast.success('Check-in submitted')
      reset({ progress_value: data.progress_value, comments: '', checkin_date: today })
      onOpenChange(false)
    } catch {
      toast.error('Failed to submit check-in')
    }
  }

  const checkinList = (checkins || []) as Array<{
    id: string
    checkin_date: string
    progress_value: number | null
    comments: string | null
    created_at: string
  }>

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Check-in: {goal.goal_title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 pb-4">
              {/* Current status info */}
              <div className="rounded-md bg-muted p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Value</span>
                  <span className="font-medium">{goal.current_value}</span>
                </div>
                {goal.target_value !== null && (
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">Target Value</span>
                    <span className="font-medium">{goal.target_value}</span>
                  </div>
                )}
              </div>

              {/* Check-in fields */}
              <div className="space-y-2">
                <Label htmlFor="progress_value">Progress Value *</Label>
                <Input
                  id="progress_value"
                  type="number"
                  min={0}
                  {...register('progress_value')}
                  placeholder="Enter current progress"
                />
                {errors.progress_value && (
                  <p className="text-sm text-destructive">{errors.progress_value.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">Comments</Label>
                <Textarea
                  id="comments"
                  {...register('comments')}
                  placeholder="Add notes about your progress..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkin_date">Check-in Date *</Label>
                <Input id="checkin_date" type="date" {...register('checkin_date')} />
                {errors.checkin_date && (
                  <p className="text-sm text-destructive">{errors.checkin_date.message}</p>
                )}
              </div>

              {/* Past Check-ins */}
              {checkinList.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-base">Check-in History</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {checkinList.map((ci) => (
                        <div key={ci.id} className="rounded-md border p-3 text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              {formatDate(ci.checkin_date)}
                            </span>
                            {ci.progress_value !== null && (
                              <span className="font-medium">Progress: {ci.progress_value}</span>
                            )}
                          </div>
                          {ci.comments && (
                            <p className="text-muted-foreground">{ci.comments}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCheckin.isPending}>
              {createCheckin.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Check-in
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
