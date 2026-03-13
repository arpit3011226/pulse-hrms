import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  useCurrentEmployee,
  useActiveCycle,
  usePerformanceCycles,
  useTeamReviews,
} from '../hooks/use-performance'
import { formatRating } from '../utils/performance-utils'
import { ManagerReviewDialog } from './manager-review-dialog'
import type { PerformanceReviewWithRelations } from '@/types/database.types'

export function TeamReviewsTab() {
  const { data: employee } = useCurrentEmployee()
  const { data: activeCycle } = useActiveCycle()
  const { data: cycles } = usePerformanceCycles()

  const [selectedCycleId, setSelectedCycleId] = useState<string>('')
  const cycleId = selectedCycleId || activeCycle?.id || ''

  const { data: reviews, isLoading } = useTeamReviews(employee?.id || '', cycleId || undefined)
  const [selectedReview, setSelectedReview] = useState<PerformanceReviewWithRelations | null>(null)

  const columns: ColumnDef<PerformanceReviewWithRelations>[] = [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const emp = row.original.employee
        return emp ? (
          <div>
            <p className="font-medium">{emp.first_name} {emp.last_name}</p>
            <p className="text-xs text-muted-foreground">{emp.employee_code}</p>
          </div>
        ) : '-'
      },
    },
    {
      id: 'department',
      header: 'Department',
      cell: ({ row }) => row.original.employee?.department?.name || '-',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'self_rating',
      header: 'Self Rating',
      cell: ({ row }) => formatRating(row.original.self_review?.self_rating ?? null),
    },
    {
      id: 'manager_rating',
      header: 'Manager Rating',
      cell: ({ row }) => formatRating(row.original.manager_review?.rating ?? null),
    },
    {
      id: 'final_rating',
      header: 'Final Rating',
      cell: ({ row }) => formatRating(row.original.final_rating),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => setSelectedReview(row.original)}>
          <Eye className="mr-1 h-4 w-4" />
          Review
        </Button>
      ),
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={(reviews || []) as PerformanceReviewWithRelations[]}
        searchKey="employee"
        searchPlaceholder="Search team members..."
        isLoading={isLoading}
        toolbarActions={
          <Select value={cycleId} onValueChange={setSelectedCycleId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select cycle" />
            </SelectTrigger>
            <SelectContent>
              {(cycles || []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.cycle_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {selectedReview && (
        <ManagerReviewDialog
          open={!!selectedReview}
          onOpenChange={(open) => { if (!open) setSelectedReview(null) }}
          review={selectedReview}
        />
      )}
    </>
  )
}
