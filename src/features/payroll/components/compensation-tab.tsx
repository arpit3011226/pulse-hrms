import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, Pencil, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/shared/data-table'
import { useEmployeeCompensations } from '../hooks/use-payroll'
import { usePermissions } from '@/hooks/use-permissions'
import { formatCurrency } from '../utils/payroll-utils'
import { CompensationDialog } from './compensation-dialog'
import type { EmployeeCompensationWithRelations } from '@/types/database.types'

export function CompensationTab() {
  const { canManagePayroll } = usePermissions()
  const { data: compensations, isLoading } = useEmployeeCompensations()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCompensation, setEditingCompensation] = useState<
    EmployeeCompensationWithRelations | undefined
  >()

  const columns: ColumnDef<EmployeeCompensationWithRelations>[] = [
    {
      id: 'employee_name',
      header: 'Employee Name',
      accessorFn: (row) =>
        `${row.employee?.first_name || ''} ${row.employee?.last_name || ''}`.trim(),
      cell: ({ row }) => {
        const emp = row.original.employee
        return (
          <div>
            <p className="font-medium">
              {emp?.first_name} {emp?.last_name}
            </p>
            {emp?.email && (
              <p className="text-xs text-muted-foreground">{emp.email}</p>
            )}
          </div>
        )
      },
    },
    {
      id: 'employee_code',
      header: 'Employee Code',
      accessorFn: (row) => row.employee?.employee_code || '-',
      cell: ({ row }) => row.original.employee?.employee_code || '-',
    },
    {
      id: 'department',
      header: 'Department',
      accessorFn: (row) => row.employee?.department?.name || '-',
      cell: ({ row }) => row.original.employee?.department?.name || '-',
    },
    {
      id: 'structure_name',
      header: 'Structure Name',
      accessorFn: (row) => row.salary_structure?.structure_name || '-',
      cell: ({ row }) => row.original.salary_structure?.structure_name || '-',
    },
    {
      accessorKey: 'annual_ctc',
      header: 'Annual CTC',
      cell: ({ row }) => formatCurrency(row.original.annual_ctc),
    },
    {
      accessorKey: 'monthly_gross',
      header: 'Monthly Gross',
      cell: ({ row }) => formatCurrency(row.original.monthly_gross),
    },
    {
      accessorKey: 'effective_from',
      header: 'Effective From',
      cell: ({ row }) =>
        row.original.effective_from
          ? new Date(row.original.effective_from).toLocaleDateString('en-IN')
          : '-',
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
            <DropdownMenuItem
              onClick={() => {
                setEditingCompensation(row.original)
                setDialogOpen(true)
              }}
            >
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setEditingCompensation(row.original)
                setDialogOpen(true)
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Revise
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
        data={(compensations || []) as EmployeeCompensationWithRelations[]}
        searchKey="employee_name"
        searchPlaceholder="Search by employee name..."
        isLoading={isLoading}
        toolbarActions={
          canManagePayroll && (
            <Button
              onClick={() => {
                setEditingCompensation(undefined)
                setDialogOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Assign Compensation
            </Button>
          )
        }
      />

      <CompensationDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingCompensation(undefined)
        }}
        compensation={editingCompensation}
      />
    </>
  )
}
