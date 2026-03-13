import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useInterviewStages, useMoveCandidateToStage } from '../hooks/use-recruitment'
import type { CandidateApplicationWithRelations } from '@/types/database.types'
import { toast } from 'sonner'

interface MoveStageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  application: CandidateApplicationWithRelations | undefined
}

export function MoveStageDialog({ open, onOpenChange, application }: MoveStageDialogProps) {
  const { data: stages } = useInterviewStages()
  const moveToStage = useMoveCandidateToStage()

  const [targetStageId, setTargetStageId] = useState('')
  const [notes, setNotes] = useState('')

  const currentStageId = application?.current_stage_id
  const currentStageName = application?.current_stage?.stage_name || 'None'

  const availableStages = (stages || [])
    .filter((s) => s.is_active && s.id !== currentStageId)
    .sort((a, b) => a.stage_order - b.stage_order)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTargetStageId('')
      setNotes('')
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = async () => {
    if (!application || !targetStageId) return

    try {
      await moveToStage.mutateAsync({
        applicationId: application.id,
        toStageId: targetStageId,
        fromStageId: currentStageId || null,
        movedBy: null,
        notes: notes || undefined,
      })
      toast.success('Candidate moved to new stage')
      handleOpenChange(false)
    } catch {
      toast.error('Failed to move candidate to stage')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move Pipeline Stage</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Current Stage</Label>
            <p className="text-sm text-muted-foreground rounded-md border px-3 py-2 bg-muted/50">
              {currentStageName}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Target Stage *</Label>
            <Select value={targetStageId} onValueChange={setTargetStageId}>
              <SelectTrigger>
                <SelectValue placeholder="Select target stage" />
              </SelectTrigger>
              <SelectContent>
                {availableStages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.stage_order}. {s.stage_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="move-notes">Notes</Label>
            <Textarea
              id="move-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes about this stage change..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!targetStageId || moveToStage.isPending}
          >
            {moveToStage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Move Stage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
