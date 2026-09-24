import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { CandidateFormDialog } from './candidate-form-dialog'
import { useCandidates, useDeleteCandidate } from '../hooks/use-recruitment'
import { usePermissions } from '@/hooks/use-permissions'
import type { Candidate } from '@/types/database.types'
import { toast } from 'sonner'

export function CandidatesTab() {
  const { canManageRecruitment, isAdmin, isHR } = usePermissions()
  const canManage = canManageRecruitment || isAdmin || isHR

  const { data: candidates, isLoading } = useCandidates()
  const deleteCandidate = useDeleteCandidate()

  const [formOpen, setFormOpen] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState<Candidate | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const columns: ColumnDef<Candidate>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.first_name} {row.original.last_name}
        </span>
      ),
      accessorFn: (row) => `${row.first_name} ${row.last_name}`,
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone || '-',
    },
    {
      accessorKey: 'experience_years',
      header: 'Experience',
      cell: ({ row }) =>
        row.original.experience_years != null
          ? `${row.original.experience_years} yrs`
          : '-',
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) => <StatusBadge status={row.original.source} />,
    },
    {
      accessorKey: 'current_company',
      header: 'Current Company',
      cell: ({ row }) => row.original.current_company || '-',
    },
  ]

  if (canManage) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => {
        const candidate = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setEditingCandidate(candidate); setFormOpen(true) }}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(candidate.id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    })
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={(candidates || []) as Candidate[]}
        searchKey="name"
        searchPlaceholder="Search candidates..."
        isLoading={isLoading}
        toolbarActions={
          canManage && (
            <Button onClick={() => { setEditingCandidate(undefined); setFormOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" /> Add Candidate
            </Button>
          )
        }
      />

      <CandidateFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingCandidate(undefined) }}
        candidate={editingCandidate}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Candidate"
        description="This will permanently delete this candidate. Candidates with existing applications cannot be deleted."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteCandidate.isPending}
        onConfirm={async () => {
          if (deleteId) {
            try {
              await deleteCandidate.mutateAsync(deleteId)
              toast.success('Candidate deleted')
            } catch {
              toast.error('Failed to delete candidate. The candidate may have existing applications.')
            }
            setDeleteId(null)
          }
        }}
      />
    </>
  )
}
