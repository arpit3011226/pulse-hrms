import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { CalendarCheck, Gavel } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { RegularizationActionDialog } from './regularization-action-dialog'
import { useAllRegularizations } from '../hooks/use-attendance'
import { formatDate } from '@/lib/utils'
import type { RegularizationRequestWithRelations } from '@/types/database.types'

const STATUS_FILTERS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
]

function timeOrDash(value: string | null | undefined): string {
  if (!value) return '—'
  // Values come back as timestamps or plain times; show HH:MM either way
  const match = value.match(/(\d{2}:\d{2})/)
  return match ? match[1] : value
}

export function AllRegularizationsTab() {
  const { data: requests, isLoading } = useAllRegularizations()
  const [status, setStatus] = useState('pending')
  const [reviewRequest, setReviewRequest] =
    useState<RegularizationRequestWithRelations | null>(null)

  const all = (requests ?? []) as RegularizationRequestWithRelations[]
  const rows = status === 'all' ? all : all.filter((r) => r.status === status)
  const pendingCount = all.filter((r) => r.status === 'pending').length

  const columns: ColumnDef<RegularizationRequestWithRelations>[] = [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const e = row.original.employee
        return e ? `${e.first_name} ${e.last_name}` : '—'
      },
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      id: 'original',
      header: 'Recorded',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {timeOrDash(row.original.original_clock_in)} – {timeOrDash(row.original.original_clock_out)}
        </span>
      ),
    },
    {
      id: 'requested',
      header: 'Requested',
      cell: ({ row }) => (
        <span className="font-medium">
          {timeOrDash(row.original.requested_clock_in)} – {timeOrDash(row.original.requested_clock_out)}
        </span>
      ),
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      cell: ({ row }) => (
        <span className="line-clamp-2 max-w-xs text-sm">{row.original.reason || '—'}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'reviewer',
      header: 'Reviewed By',
      cell: ({ row }) => {
        const r = row.original.reviewer
        return r ? `${r.first_name} ${r.last_name}` : '—'
      },
    },
    {
      id: 'actions',
      cell: ({ row }) =>
        row.original.status === 'pending' ? (
          <Button variant="outline" size="sm" onClick={() => setReviewRequest(row.original)}>
            <Gavel className="mr-1.5 h-3.5 w-3.5" /> Review
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pendingCount === 0
            ? 'No requests are waiting for review.'
            : `${pendingCount} request${pendingCount === 1 ? '' : 's'} waiting for review.`}
        </p>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isLoading && rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full bg-blue-50 p-3">
              <CalendarCheck className="h-6 w-6 text-blue-600" />
            </div>
            <p className="font-medium">Nothing here</p>
            <p className="mt-1 text-sm text-muted-foreground">
              No {status === 'all' ? '' : status} regularisation requests found.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DataTable columns={columns} data={rows} isLoading={isLoading} />
      )}

      <RegularizationActionDialog
        open={!!reviewRequest}
        onOpenChange={(open) => !open && setReviewRequest(null)}
        request={reviewRequest}
      />
    </div>
  )
}
