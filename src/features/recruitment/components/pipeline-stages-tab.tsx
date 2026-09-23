import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, Pencil, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/shared/data-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useInterviewCompetencies, useCreateInterviewCompetency } from '../hooks/use-recruitment'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { StageFormDialog } from './stage-form-dialog'
import {
  useInterviewStages,
  useDeleteInterviewStage,
} from '../hooks/use-recruitment'
import type { InterviewStage } from '@/types/database.types'

/**
 * F15 — the competencies a panel rates against.
 *
 * Without at least one of these the scorecard section never appears on the
 * feedback form, which is what made structured scoring unreachable.
 */
function CompetencySection() {
  const { data: competencies } = useInterviewCompetencies()
  const createCompetency = useCreateInterviewCompetency()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const list = (competencies ?? []) as Array<Record<string, unknown>>

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">Interview scorecard</CardTitle>
          <CardDescription>
            What every panel member rates from 1 to 5. Without at least one, feedback stays as free
            text and cannot be compared across a panel.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add competency
        </Button>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">
            No competencies yet. Three or four is usually plenty — for example Technical depth,
            Problem solving, Communication, Ownership.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {list.map((c) => (
              <Badge key={c.id as string} variant="secondary">{c.name as string}</Badge>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add competency</DialogTitle>
            <DialogDescription>Panels will rate this on every interview.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                placeholder="e.g. Problem solving"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!name.trim()}
              onClick={async () => {
                try {
                  await createCompetency.mutateAsync({
                    name: name.trim(),
                    description: description.trim() || null,
                    sort_order: list.length + 1,
                    is_active: true,
                  })
                  toast.success('Competency added')
                  setName(''); setDescription('')
                  setOpen(false)
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Could not add it')
                }
              }}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export function PipelineStagesTab() {
  const { data: stages, isLoading } = useInterviewStages()
  const deleteStage = useDeleteInterviewStage()

  const [formOpen, setFormOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<InterviewStage | undefined>()
  const [deactivateId, setDeactivateId] = useState<string | null>(null)

  const columns: ColumnDef<InterviewStage>[] = [
    {
      accessorKey: 'stage_name',
      header: 'Stage Name',
      cell: ({ row }) => <span className="font-medium">{row.original.stage_name}</span>,
    },
    {
      accessorKey: 'stage_order',
      header: 'Order',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.stage_order}</Badge>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Active',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditingStage(row.original); setFormOpen(true) }}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            {row.original.is_active && (
              <DropdownMenuItem className="text-destructive" onClick={() => setDeactivateId(row.original.id)}>
                <XCircle className="mr-2 h-4 w-4" /> Deactivate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={(stages || []) as InterviewStage[]}
        searchKey="stage_name"
        searchPlaceholder="Search stages..."
        isLoading={isLoading}
        toolbarActions={
          <Button onClick={() => { setEditingStage(undefined); setFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Add Stage
          </Button>
        }
      />

      <StageFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingStage(undefined) }}
        stage={editingStage}
      />

      <ConfirmDialog
        open={!!deactivateId}
        onOpenChange={() => setDeactivateId(null)}
        title="Deactivate Stage"
        description="This will deactivate the interview stage. Existing applications at this stage will not be affected."
        confirmLabel="Deactivate"
        variant="destructive"
        isLoading={deleteStage.isPending}
        onConfirm={async () => {
          if (deactivateId) {
            try {
              await deleteStage.mutateAsync(deactivateId)
              toast.success('Stage deactivated')
            } catch {
              toast.error('Failed to deactivate stage')
            }
            setDeactivateId(null)
          }
        }}
      />

      <CompetencySection />

    </>
  )
}
