import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/data-table'
import { useAllReimbursements } from '../hooks/use-reimbursements'
import { REIMBURSEMENT_CATEGORIES } from '@/lib/constants'
import type { ColumnDef } from '@tanstack/react-table'
import type { ReimbursementRequestWithRelations } from '@/types/database.types'

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  pending_manager: { label: 'Pending Manager', color: 'bg-yellow-100 text-yellow-800' },
  manager_approved: { label: 'Manager Approved', color: 'bg-blue-100 text-blue-800' },
  manager_rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  pending_finance: { label: 'Pending Finance', color: 'bg-orange-100 text-orange-800' },
  finance_approved: { label: 'Finance Approved', color: 'bg-green-100 text-green-800' },
  finance_rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600' },
}

const columns: ColumnDef<ReimbursementRequestWithRelations>[] = [
  {
    id: 'employee',
    header: 'Employee',
    cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? (
        <div>
          <p className="font-medium text-sm">{emp.first_name} {emp.last_name}</p>
          <p className="text-xs text-muted-foreground">{emp.department?.name || ''}</p>
        </div>
      ) : '-'
    },
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => {
      const label = REIMBURSEMENT_CATEGORIES.find(c => c.value === row.original.category)?.label
      return <span className="text-sm">{label || row.original.category}</span>
    },
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => (
      <span className="text-sm font-medium">₹{Number(row.original.amount).toLocaleString('en-IN')}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = STATUS_STYLES[row.original.status] || STATUS_STYLES.draft
      return <Badge variant="outline" className={s.color}>{s.label}</Badge>
    },
  },
  {
    accessorKey: 'expense_date',
    header: 'Expense Date',
    cell: ({ row }) => (
      <span className="text-sm">
        {new Date(row.original.expense_date).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
        })}
      </span>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Submitted On',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {new Date(row.original.created_at).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
        })}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      if (!row.original.receipt_url) return null
      return (
        <a
          href={row.original.receipt_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="ghost" size="sm">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
      )
    },
  },
]

export function AllReimbursementsTab() {
  const { data: requests, isLoading } = useAllReimbursements()

  return (
    <DataTable
      columns={columns}
      data={requests || []}
      searchKey="employee"
      searchPlaceholder="Search employees..."
      isLoading={isLoading}
    />
  )
}
