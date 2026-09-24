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
import { CompetencyFormDialog } from './competency-form-dialog'
import { useReviewCompetencies, useUpdateReviewCompetency } from '../hooks/use-performance'
import { COMPETENCY_CATEGORIES } from '@/lib/constants'
import { toast } from 'sonner'
import type { ReviewCompetency } from '@/types/database.types'

const categoryLabel = (value: string) =>
  COMPETENCY_CATEGORIES.find((c) => c.value === value)?.label ?? value

export function CompetenciesTab() {
  const { data: competencies, isLoading } = useReviewCompetencies()
  const updateCompetency = useUpdateReviewCompetency()

  const [formOpen, setFormOpen] = useState(false)
  const [editingCompetency, setEditingCompetency] = useState<ReviewCompetency | undefined>()
  const [deactivateId, setDeactivateId] = useState<string | null>(null)

  const columns: ColumnDef<ReviewCompetency>[] = [
    {
      accessorKey: 'competency_name',
      header: 'Competency',
      cell: ({ row }) => <span className="font-medium">{row.original.competency_name}</span>,
    },
    {
      accessorKey: 'competency_code',
      header: 'Code',
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => categoryLabel(row.original.category),
    },
    {
      accessorKey: 'display_order',
      header: 'Order',
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge status={row.original.is_active ? 'active' : 'inactive'} />
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const competency = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditingCompetency(competency)
                  setFormOpen(true)
                }}
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              {competency.is_active && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDeactivateId(competency.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Deactivate
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={(competencies || []) as ReviewCompetency[]}
        searchKey="competency_name"
        searchPlaceholder="Search competencies..."
        isLoading={isLoading}
        toolbarActions={
          <Button
            onClick={() => {
              setEditingCompetency(undefined)
              setFormOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Competency
          </Button>
        }
      />

      <CompetencyFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingCompetency(undefined)
        }}
        competency={editingCompetency}
      />

      <ConfirmDialog
        open={!!deactivateId}
        onOpenChange={() => setDeactivateId(null)}
        title="Deactivate Competency"
        description="Are you sure you want to deactivate this competency? It will no longer appear in new reviews."
        confirmLabel="Deactivate"
        variant="destructive"
        isLoading={updateCompetency.isPending}
        onConfirm={async () => {
          if (deactivateId) {
            try {
              await updateCompetency.mutateAsync({ id: deactivateId, is_active: false } as any)
              toast.success('Competency deactivated')
            } catch {
              toast.error('Failed to deactivate competency')
            }
            setDeactivateId(null)
          }
        }}
      />
    </>
  )
}
