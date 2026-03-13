import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Eye, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  useCurrentEmployee,
  useActiveCycle,
  usePerformanceCycles,
  useTeamReviews,
  useReviewParticipants,
} from '../hooks/use-performance'
import { formatRating } from '../utils/performance-utils'
import { ManagerReviewDialog } from './manager-review-dialog'
import { AssignPeerReviewersDialog } from './assign-peer-reviewers-dialog'
import type { PerformanceReviewWithRelations, ReviewParticipantWithRelations } from '@/types/database.types'

function PeerCompletionCell({ reviewId }: { reviewId: string }) {
  const { data: participants } = useReviewParticipants(reviewId)
  const peers = ((participants || []) as ReviewParticipantWithRelations[]).filter(
    (p) => p.reviewer_type === 'peer'
  )
  if (peers.length === 0) return <span className="text-muted-foreground">—</span>
  const submitted = peers.filter((p) => p.status === 'submitted').length
  return (
    <span className="text-sm">
      {submitted}/{peers.length} peers
    </span>
  )
}

export function TeamReviewsTab() {
  const { data: employee } = useCurrentEmployee()
  const { data: activeCycle } = useActiveCycle()
  const { data: cycles } = usePerformanceCycles()

  const [selectedCycleId, setSelectedCycleId] = useState<string>('')
  const cycleId = selectedCycleId || activeCycle?.id || ''

  const { data: reviews, isLoading } = useTeamReviews(employee?.id || '', cycleId || undefined)
  const [selectedReview, setSelectedReview] = useState<PerformanceReviewWithRelations | null>(null)
  const [assignReviewId, setAssignReviewId] = useState<string>('')
  const [assignEmployeeId, setAssignEmployeeId] = useState<string>('')

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
      id: 'peer_completion',
      header: 'Peer Reviews',
      cell: ({ row }) => <PeerCompletionCell reviewId={row.original.id} />,
    },
    {
      id: 'final_rating',
      header: 'Final Rating',
      cell: ({ row }) => formatRating(row.original.final_rating),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setSelectedReview(row.original)}>
            <Eye className="mr-1 h-4 w-4" />
            Review
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAssignReviewId(row.original.id)
              setAssignEmployeeId(row.original.employee_id)
            }}
          >
            <Users className="mr-1 h-4 w-4" />
            Peers
          </Button>
        </div>
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

      {assignReviewId && (
        <AssignPeerReviewersDialog
          open={!!assignReviewId}
          onOpenChange={(open) => {
            if (!open) {
              setAssignReviewId('')
              setAssignEmployeeId('')
            }
          }}
          reviewId={assignReviewId}
          employeeId={assignEmployeeId}
        />
      )}
    </>
  )
}
