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
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { StageFormDialog } from './stage-form-dialog'
import {
  useInterviewStages,
  useDeleteInterviewStage,
} from '../hooks/use-recruitment'
import type { InterviewStage } from '@/types/database.types'
import { toast } from 'sonner'

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
    </>
  )
}
