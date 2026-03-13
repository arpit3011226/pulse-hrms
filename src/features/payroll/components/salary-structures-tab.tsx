import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { StructureFormDialog } from './structure-form-dialog'
import {
  useSalaryStructures,
  useDeleteSalaryStructure,
} from '../hooks/use-payroll'
import { usePermissions } from '@/hooks/use-permissions'
import { toast } from 'sonner'

interface SalaryStructureRow {
  id: string
  structure_name: string
  structure_code: string
  description: string | null
  is_default: boolean
  is_active: boolean
  salary_structure_components: {
    id: string
    salary_component_id: string
    calculation_type: string
    default_value: number
    display_order: number
    salary_component: {
      id: string
      component_name: string
      component_code: string
      component_type: string
    }
  }[]
}

export function SalaryStructuresTab() {
  const { canManagePayroll } = usePermissions()
  const { data: structures, isLoading } = useSalaryStructures()
  const deleteStructure = useDeleteSalaryStructure()
  const [formOpen, setFormOpen] = useState(false)
  const [editingStructure, setEditingStructure] = useState<SalaryStructureRow | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const columns: ColumnDef<SalaryStructureRow>[] = [
    {
      accessorKey: 'structure_name',
      header: 'Structure Name',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.structure_name}</p>
          {row.original.description && (
            <p className="text-xs text-muted-foreground">{row.original.description}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'structure_code',
      header: 'Code',
      cell: ({ row }) => row.original.structure_code || '-',
    },
    {
      id: 'components_count',
      header: '# Components',
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.original.salary_structure_components?.length || 0}
        </Badge>
      ),
    },
    {
      accessorKey: 'is_default',
      header: 'Default',
      cell: ({ row }) => (
        <Badge variant={row.original.is_default ? 'default' : 'outline'}>
          {row.original.is_default ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge status={row.original.is_active ? 'active' : 'terminated'} />
      ),
    },
  ]

  if (canManagePayroll) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditingStructure(row.original); setFormOpen(true) }}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(row.original.id)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    })
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={(structures || []) as SalaryStructureRow[]}
        searchKey="structure_name"
        searchPlaceholder="Search salary structures..."
        isLoading={isLoading}
        toolbarActions={
          canManagePayroll && (
            <Button onClick={() => { setEditingStructure(undefined); setFormOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" /> Add Structure
            </Button>
          )
        }
      />

      <StructureFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingStructure(undefined) }}
        structure={editingStructure}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Salary Structure"
        description="This will permanently delete the salary structure and its component assignments. Employees using this structure will need to be reassigned."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteStructure.isPending}
        onConfirm={async () => {
          if (deleteId) {
            try {
              await deleteStructure.mutateAsync(deleteId)
              toast.success('Salary structure deleted')
            } catch {
              toast.error('Failed to delete salary structure')
            }
            setDeleteId(null)
          }
        }}
      />
    </>
  )
}
