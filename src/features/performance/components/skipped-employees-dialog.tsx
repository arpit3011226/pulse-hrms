import { type ColumnDef } from '@tanstack/react-table'
import { Loader2, UserPlus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/data-table'
import { toast } from 'sonner'
import {
  useSkippedEmployees,
  useManuallyIncludeEmployee,
} from '../hooks/use-performance'

interface SkippedRow {
  employee: {
    id: string
    first_name: string
    last_name: string
    employee_code: string
    date_of_joining: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    department: any
  }
  reason: string
}

interface SkippedEmployeesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cycleId: string
}

export function SkippedEmployeesDialog({ open, onOpenChange, cycleId }: SkippedEmployeesDialogProps) {
  const { data: skipped, isLoading } = useSkippedEmployees(cycleId)
  const includeEmployee = useManuallyIncludeEmployee()

  const handleInclude = async (employeeId: string) => {
    try {
      await includeEmployee.mutateAsync({ cycleId, employeeId })
      toast.success('Employee included in review cycle')
    } catch {
      toast.error('Failed to include employee')
    }
  }

  const columns: ColumnDef<SkippedRow>[] = [
    {
      id: 'name',
      header: 'Employee',
      cell: ({ row }) => {
        const emp = row.original.employee
        return (
          <div>
            <p className="font-medium">{emp.first_name} {emp.last_name}</p>
            <p className="text-xs text-muted-foreground">{emp.employee_code}</p>
          </div>
        )
      },
    },
    {
      id: 'department',
      header: 'Department',
      cell: ({ row }) => {
        const dept = row.original.employee.department
        if (Array.isArray(dept) && dept.length > 0) return dept[0].name
        if (dept && typeof dept === 'object' && 'name' in dept) return dept.name
        return '-'
      },
    },
    {
      id: 'joining_date',
      header: 'Joining Date',
      cell: ({ row }) =>
        row.original.employee.date_of_joining
          ? new Date(row.original.employee.date_of_joining).toLocaleDateString()
          : '-',
    },
    {
      id: 'reason',
      header: 'Skip Reason',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.reason}</span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleInclude(row.original.employee.id)}
          disabled={includeEmployee.isPending}
        >
          {includeEmployee.isPending ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <UserPlus className="mr-1 h-3 w-3" />
          )}
          Include
        </Button>
      ),
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Skipped Employees</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          <DataTable
            columns={columns}
            data={((skipped || []) as unknown) as SkippedRow[]}
            searchKey="name"
            searchPlaceholder="Search skipped employees..."
            isLoading={isLoading}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
