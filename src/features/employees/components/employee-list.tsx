import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, Eye, Pencil, Trash2, ArrowUpRight, LogOut, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { PageHeader } from '@/components/layout/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useEmployees, useDeleteEmployee } from '../hooks/use-employees'
import { usePermissions } from '@/hooks/use-permissions'
import { CsvUploadDialog } from './csv-upload-dialog'
import { getInitials, formatDate } from '@/lib/utils'
import type { Employee } from '@/types/database.types'

type EmployeeRow = Employee & {
  department?: { id: string; name: string } | null
  designation?: { id: string; title: string } | null
}

export function EmployeeList() {
  const { data: employees, isLoading, error } = useEmployees()
  if (error) console.error('Employee list error:', error)
  const deleteEmployee = useDeleteEmployee()
  const permissions = usePermissions()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [csvDialogOpen, setCsvDialogOpen] = useState(false)

  const columns: ColumnDef<EmployeeRow>[] = [
    {
      accessorKey: 'first_name',
      header: 'Employee',
      cell: ({ row }) => {
        const emp = row.original
        return (
          <Link to="/employees/$employeeId" params={{ employeeId: emp.id }} search={{}} className="flex items-center gap-3 hover:underline">
            <Avatar className="h-9 w-9">
              <AvatarImage src={emp.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(emp.first_name, emp.last_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{emp.first_name} {emp.last_name}</p>
              <p className="text-xs text-muted-foreground">{emp.email}</p>
            </div>
          </Link>
        )
      },
    },
    {
      accessorKey: 'employee_code',
      header: 'ID',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.employee_code || '-'}</span>
      ),
    },
    {
      id: 'department',
      header: 'Department',
      cell: ({ row }) => row.original.department?.name || '-',
    },
    {
      id: 'designation',
      header: 'Designation',
      cell: ({ row }) => row.original.designation?.title || '-',
    },
    {
      accessorKey: 'employment_type',
      header: 'Type',
      cell: ({ row }) => <StatusBadge status={row.original.employment_type} />,
    },
    {
      accessorKey: 'date_of_joining',
      header: 'Joined',
      cell: ({ row }) => row.original.date_of_joining ? formatDate(row.original.date_of_joining) : '-',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const emp = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/employees/$employeeId" params={{ employeeId: emp.id }}>
                  <Eye className="mr-2 h-4 w-4" /> View
                </Link>
              </DropdownMenuItem>
              {permissions.canManageEmployees && (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/employees/$employeeId/edit" params={{ employeeId: emp.id }}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/employees/$employeeId" params={{ employeeId: emp.id }}>
                      <ArrowUpRight className="mr-2 h-4 w-4" /> Promote / Transfer
                    </Link>
                  </DropdownMenuItem>
                  {emp.status === 'active' && (
                    <DropdownMenuItem asChild>
                      <Link to="/employees/$employeeId" params={{ employeeId: emp.id }}>
                        <LogOut className="mr-2 h-4 w-4" /> Initiate Exit
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDeleteId(emp.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
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
    <div>
      <PageHeader
        title="Employees"
        description="Manage your organization's employees"
        actions={
          permissions.canManageEmployees ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setCsvDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> CSV Upload
              </Button>
              <Button asChild>
                <Link to="/employees/new">
                  <Plus className="mr-2 h-4 w-4" /> Add Employee
                </Link>
              </Button>
            </div>
          ) : undefined
        }
      />

      <DataTable
        columns={columns}
        data={(employees as EmployeeRow[]) || []}
        isLoading={isLoading}
        searchKey="first_name"
        searchPlaceholder="Search employees..."
      />

      <CsvUploadDialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen} />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Employee"
        description="Are you sure you want to delete this employee? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteEmployee.isPending}
        onConfirm={() => {
          if (deleteId) {
            deleteEmployee.mutate(deleteId, {
              onSuccess: () => setDeleteId(null),
            })
          }
        }}
      />
    </div>
  )
}
