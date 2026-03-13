import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { BalanceAdjustmentDialog } from './balance-adjustment-dialog'
import { useAllLeaveBalances, useInitializeYearBalances } from '../hooks/use-leave'
import { usePermissions } from '@/hooks/use-permissions'
import type { LeaveBalanceWithRelations } from '@/types/database.types'
import { toast } from 'sonner'

export function LeaveBalancesTab() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const { data: balances, isLoading } = useAllLeaveBalances(selectedYear)
  const initBalances = useInitializeYearBalances()
  const { canManageLeaveTypes } = usePermissions()
  const [initConfirmOpen, setInitConfirmOpen] = useState(false)
  const [adjusting, setAdjusting] = useState<LeaveBalanceWithRelations | null>(null)

  const years = Array.from({ length: 3 }, (_, i) => currentYear - 1 + i)

  const columns: ColumnDef<LeaveBalanceWithRelations>[] = [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const emp = row.original.employee
        return emp ? `${emp.first_name} ${emp.last_name}` : '-'
      },
    },
    {
      id: 'leave_type',
      header: 'Leave Type',
      cell: ({ row }) => row.original.leave_type?.name || '-',
    },
    {
      accessorKey: 'total_days',
      header: 'Total',
    },
    {
      accessorKey: 'used_days',
      header: 'Used',
    },
    {
      accessorKey: 'pending_days',
      header: 'Pending',
    },
    {
      accessorKey: 'carried_forward_days',
      header: 'Carried Forward',
    },
    {
      id: 'available',
      header: 'Available',
      cell: ({ row }) => {
        const b = row.original
        const available = Math.max(0, b.total_days + b.carried_forward_days - b.used_days - b.pending_days)
        return <span className="font-medium">{available}</span>
      },
    },
  ]

  if (canManageLeaveTypes) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setAdjusting(row.original)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    })
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={(balances || []) as LeaveBalanceWithRelations[]}
        searchKey="employee"
        searchPlaceholder="Search employees..."
        isLoading={isLoading}
        toolbarActions={
          <div className="flex items-center gap-2">
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canManageLeaveTypes && (
              <Button variant="outline" onClick={() => setInitConfirmOpen(true)}>
                <RefreshCw className="mr-2 h-4 w-4" /> Initialize {selectedYear}
              </Button>
            )}
          </div>
        }
      />

      <ConfirmDialog
        open={initConfirmOpen}
        onOpenChange={setInitConfirmOpen}
        title="Initialize Year Balances"
        description={`This will create leave balance records for all employees for ${selectedYear} based on their assigned leave policies. Existing balances will not be overwritten.`}
        confirmLabel="Initialize"
        isLoading={initBalances.isPending}
        onConfirm={async () => {
          try {
            await initBalances.mutateAsync(selectedYear)
            toast.success(`Balances initialized for ${selectedYear}`)
          } catch {
            toast.error('Failed to initialize balances')
          }
          setInitConfirmOpen(false)
        }}
      />

      {adjusting && (
        <BalanceAdjustmentDialog
          open={!!adjusting}
          onOpenChange={(open) => { if (!open) setAdjusting(null) }}
          balanceId={adjusting.id}
          employeeName={adjusting.employee ? `${adjusting.employee.first_name} ${adjusting.employee.last_name}` : 'Employee'}
          leaveTypeName={adjusting.leave_type?.name || 'Leave'}
          currentValues={{
            total_days: adjusting.total_days,
            used_days: adjusting.used_days,
            pending_days: adjusting.pending_days,
          }}
        />
      )}
    </>
  )
}
