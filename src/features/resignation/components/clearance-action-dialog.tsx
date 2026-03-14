import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateClearance } from '../hooks/use-clearance'
import { toast } from 'sonner'
import type { ExitClearance } from '@/types/database.types'

interface ClearanceActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clearance: ExitClearance | null
  approverEmployeeId: string
}

export function ClearanceActionDialog({
  open,
  onOpenChange,
  clearance,
  approverEmployeeId,
}: ClearanceActionDialogProps) {
  const updateClearance = useUpdateClearance()
  const [notes, setNotes] = useState('')

  if (!clearance) return null

  const handleSubmit = async (decision: 'no_objection' | 'objection') => {
    if (decision === 'objection' && !notes.trim()) {
      toast.error('Please provide notes explaining the objection')
      return
    }

    try {
      await updateClearance.mutateAsync({
        clearanceId: clearance.id,
        status: decision,
        notes: notes || null,
        clearedByEmployeeId: approverEmployeeId,
      })
      toast.success(
        decision === 'no_objection'
          ? 'No objection submitted successfully'
          : 'Objection recorded'
      )
      setNotes('')
      onOpenChange(false)
    } catch {
      toast.error('Failed to update clearance')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Department Clearance</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Department</span>
            <span className="font-medium">{clearance.department_name}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="clearance_notes">Notes (required for objection)</Label>
          <Textarea
            id="clearance_notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes or remarks..."
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateClearance.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleSubmit('objection')}
            disabled={updateClearance.isPending}
          >
            {updateClearance.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Objection
          </Button>
          <Button
            onClick={() => handleSubmit('no_objection')}
            disabled={updateClearance.isPending}
          >
            {updateClearance.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            No Objection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
