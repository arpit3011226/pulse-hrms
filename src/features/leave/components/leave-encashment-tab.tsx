import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Banknote, Check, MoreHorizontal, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { LeaveEncashmentDialog } from './leave-encashment-dialog'
import { useCurrentEmployee, useEncashmentRequests, useUpdateEncashmentStatus } from '../hooks/use-leave'
import { usePermissions } from '@/hooks/use-permissions'
import { formatDate, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

type EncashmentRow = {
  id: string
  employee_id: string
  days_requested: number
  amount_per_day: number | null
  total_amount: number | null
  status: string
  period_year: number
  remarks: string | null
  created_at: string
  leave_type?: { id: string; name: string } | null
  employee?: { id: string; first_name: string; last_name: string; email: string } | null
}

export function LeaveEncashmentTab() {
  const { canManageLeavePolicies, isAdmin, isHR } = usePermissions()
  const { data: employee } = useCurrentEmployee()
  const employeeId = employee?.id ?? ''
  const canApprove = canManageLeavePolicies || isAdmin || isHR

  const { data: requests, isLoading } = useEncashmentRequests()
  const updateStatus = useUpdateEncashmentStatus()

  const [requestOpen, setRequestOpen] = useState(false)
  const [action, setAction] = useState<{ id: string; status: string; label: string } | null>(null)

  // Everyone can see their own; approvers see all
  const rows = ((requests ?? []) as EncashmentRow[]).filter(
    (r) => canApprove || r.employee_id === employeeId
  )

  const columns: ColumnDef<EncashmentRow>[] = []

  if (canApprove) {
    columns.push({
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const e = row.original.employee
        return e ? `${e.first_name} ${e.last_name}` : '—'
      },
    })
  }

  columns.push(
    {
      id: 'leave_type',
      header: 'Leave Type',
      cell: ({ row }) => row.original.leave_type?.name ?? '—',
    },
    { accessorKey: 'days_requested', header: 'Days' },
    {
      accessorKey: 'total_amount',
      header: 'Amount',
      cell: ({ row }) =>
        row.original.total_amount != null ? formatCurrency(row.original.total_amount) : '—',
    },
    { accessorKey: 'period_year', header: 'Year' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'created_at',
      header: 'Requested On',
      cell: ({ row }) => formatDate(row.original.created_at),
    }
  )

  if (canApprove) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => {
        const r = row.original
        if (r.status !== 'pending') return null
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setAction({ id: r.id, status: 'approved', label: 'Approve' })}
              >
                <Check className="mr-2 h-4 w-4" /> Approve
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setAction({ id: r.id, status: 'rejected', label: 'Reject' })}
              >
                <X className="mr-2 h-4 w-4" /> Reject
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    })
  }

  async function confirmAction() {
    if (!action) return
    try {
      await updateStatus.mutateAsync({
        id: action.id,
        status: action.status,
        approvedBy: employeeId || undefined,
      })
      toast.success(`Request ${action.status}`)
    } catch {
      toast.error(`Could not ${action.label.toLowerCase()} the request`)
    } finally {
      setAction(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setRequestOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Request Encashment
        </Button>
      </div>

      {!isLoading && rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full bg-emerald-50 p-3">
              <Banknote className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="font-medium">No encashment requests yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Unused leave can be encashed against your available balance.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DataTable columns={columns} data={rows} isLoading={isLoading} />
      )}

      <LeaveEncashmentDialog open={requestOpen} onOpenChange={setRequestOpen} />

      <ConfirmDialog
        open={!!action}
        onOpenChange={() => setAction(null)}
        title={`${action?.label ?? 'Update'} encashment request`}
        description={
          action?.status === 'approved'
            ? 'The request will be marked approved. Payment is handled in payroll.'
            : 'The request will be marked rejected.'
        }
        confirmLabel={action?.label ?? 'Confirm'}
        variant={action?.status === 'rejected' ? 'destructive' : 'default'}
        onConfirm={confirmAction}
      />
    </div>
  )
}
