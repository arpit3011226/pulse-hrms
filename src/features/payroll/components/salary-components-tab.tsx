import { useState, useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2, Sprout } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
  SALARY_COMPONENT_TYPES,
  SALARY_COMPONENT_CATEGORIES,
  CALCULATION_TYPES,
} from '@/lib/constants'
import { usePermissions } from '@/hooks/use-permissions'
import {
  useSalaryComponents,
  useDeleteSalaryComponent,
  useSeedDefaultComponents,
} from '../hooks/use-payroll'
import { ComponentFormDialog } from './component-form-dialog'
import type { SalaryComponent } from '@/types/database.types'
import { toast } from 'sonner'

// Label lookup helpers
const typeLabel = (v: string) =>
  SALARY_COMPONENT_TYPES.find((t) => t.value === v)?.label ?? v
const categoryLabel = (v: string) =>
  SALARY_COMPONENT_CATEGORIES.find((c) => c.value === v)?.label ?? v
const calcLabel = (v: string) =>
  CALCULATION_TYPES.find((c) => c.value === v)?.label ?? v

export function SalaryComponentsTab() {
  const { canManagePayroll, isAdmin, isPayrollAdmin } = usePermissions()
  const { data: components = [], isLoading } = useSalaryComponents()
  const deleteMutation = useDeleteSalaryComponent()
  const seedMutation = useSeedDefaultComponents()

  const [formOpen, setFormOpen] = useState(false)
  const [editingComponent, setEditingComponent] = useState<SalaryComponent | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<SalaryComponent | null>(null)

  const canEdit = canManagePayroll || isAdmin || isPayrollAdmin

  const handleAdd = () => {
    setEditingComponent(undefined)
    setFormOpen(true)
  }

  const handleEdit = (comp: SalaryComponent) => {
    setEditingComponent(comp)
    setFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success('Component deactivated')
    } catch {
      toast.error('Failed to deactivate component')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleSeedDefaults = async () => {
    try {
      await seedMutation.mutateAsync()
      toast.success('Default India salary components seeded')
    } catch {
      toast.error('Failed to seed default components')
    }
  }

  const columns = useMemo<ColumnDef<SalaryComponent, unknown>[]>(
    () => [
      {
        accessorKey: 'component_name',
        header: 'Component Name',
      },
      {
        accessorKey: 'component_code',
        header: 'Code',
      },
      {
        accessorKey: 'component_type',
        header: 'Type',
        cell: ({ row }) => typeLabel(row.original.component_type),
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => categoryLabel(row.original.category),
      },
      {
        accessorKey: 'calculation_type',
        header: 'Calculation',
        cell: ({ row }) => calcLabel(row.original.calculation_type),
      },
      {
        accessorKey: 'default_value',
        header: 'Default Value',
        cell: ({ row }) => {
          const calc = row.original.calculation_type
          const val = row.original.default_value
          return calc === 'flat' ? `\u20B9${val.toLocaleString()}` : `${val}%`
        },
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge status={row.original.is_active ? 'active' : 'inactive'} />
        ),
      },
      ...(canEdit
        ? [
            {
              id: 'actions',
              header: 'Actions',
              cell: ({ row }: { row: { original: SalaryComponent } }) => (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(row.original)}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(row.original)}
                    title="Deactivate"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ),
            } as ColumnDef<SalaryComponent, unknown>,
          ]
        : []),
    ],
    [canEdit]
  )

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={components}
        searchKey="component_name"
        searchPlaceholder="Search components..."
        isLoading={isLoading}
        toolbarActions={
          canEdit ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSeedDefaults} disabled={seedMutation.isPending}>
                <Sprout className="mr-2 h-4 w-4" />
                Seed Defaults
              </Button>
              <Button size="sm" onClick={handleAdd}>
                Add Component
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Add / Edit Dialog */}
      <ComponentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        component={editingComponent}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
        title="Deactivate Component"
        description={`Are you sure you want to deactivate "${deleteTarget?.component_name}"? This will mark the component as inactive.`}
        confirmLabel="Deactivate"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
