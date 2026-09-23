import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type ColumnDef } from '@tanstack/react-table'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DataTable } from '@/components/shared/data-table'
import { SkipLevelReviewDialog } from './skip-level-review-dialog'
import { StatusBadge } from '@/components/shared/status-badge'
import { toast } from 'sonner'
import {
  usePerformanceCycles,
  usePerformanceReviews,
  useFinalizeReview,
} from '../hooks/use-performance'
import { formatRating, getRatingBgColor, getRatingLabel } from '../utils/performance-utils'
import { RATING_SCALE } from '@/lib/constants'
import type { PerformanceReviewWithRelations } from '@/types/database.types'

const finalizeSchema = z.object({
  finalRating: z.coerce
    .number()
    .min(RATING_SCALE.MIN, `Minimum rating is ${RATING_SCALE.MIN}`)
    .max(RATING_SCALE.MAX, `Maximum rating is ${RATING_SCALE.MAX}`),
})

type FinalizeFormData = z.infer<typeof finalizeSchema>

export function AllReviewsTab() {
  const { data: cycles } = usePerformanceCycles()
  const [selectedCycleId, setSelectedCycleId] = useState<string>('')
  const { data: reviews, isLoading } = usePerformanceReviews(selectedCycleId || undefined)
  const finalizeReview = useFinalizeReview()

  const [finalizeTarget, setFinalizeTarget] = useState<PerformanceReviewWithRelations | null>(null)
  const [skipLevelTarget, setSkipLevelTarget] = useState<PerformanceReviewWithRelations | null>(null)

  const canFinalize = (status: string) =>
    status === 'manager_review_done' || status === 'acknowledged'

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
      id: 'cycle',
      header: 'Cycle',
      cell: ({ row }) => row.original.performance_cycle?.cycle_name || '-',
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
      cell: ({ row }) => {
        const rating = row.original.final_rating
        if (rating === null || rating === undefined) return '-'
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${getRatingBgColor(rating)}`}>
            {formatRating(rating)}
          </span>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSkipLevelTarget(row.original)}>
            Skip-Level
          </Button>
          {canFinalize(row.original.status) && (
            <Button variant="outline" size="sm" onClick={() => setFinalizeTarget(row.original)}>
              Finalize
            </Button>
          )}
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
        searchPlaceholder="Search employees..."
        isLoading={isLoading}
        toolbarActions={
          <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All cycles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cycles</SelectItem>
              {(cycles || []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.cycle_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <SkipLevelReviewDialog
        open={!!skipLevelTarget}
        onOpenChange={(open) => !open && setSkipLevelTarget(null)}
        review={skipLevelTarget}
      />

      {finalizeTarget && (
        <FinalizeDialog
          open={!!finalizeTarget}
          onOpenChange={(open) => { if (!open) setFinalizeTarget(null) }}
          review={finalizeTarget}
          onFinalize={async (rating: number) => {
            try {
              await finalizeReview.mutateAsync({
                reviewId: finalizeTarget.id,
                finalRating: rating,
                ratingLabel: getRatingLabel(rating),
              })
              toast.success('Review finalized successfully')
              setFinalizeTarget(null)
            } catch {
              toast.error('Failed to finalize review')
            }
          }}
          isPending={finalizeReview.isPending}
        />
      )}
    </>
  )
}

interface FinalizeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  review: PerformanceReviewWithRelations
  onFinalize: (rating: number) => Promise<void>
  isPending: boolean
}

function FinalizeDialog({ open, onOpenChange, review, onFinalize, isPending }: FinalizeDialogProps) {
  const employeeName = review.employee
    ? `${review.employee.first_name} ${review.employee.last_name}`
    : 'Employee'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FinalizeFormData>({
    resolver: zodResolver(finalizeSchema) as any,
    defaultValues: {
      finalRating: review.manager_review?.rating ?? undefined,
    },
  })

  const onSubmit = async (data: FinalizeFormData) => {
    await onFinalize(data.finalRating)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Finalize Review: {employeeName}</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-1">
          <div>
            <span className="font-medium">Self Rating:</span>{' '}
            {formatRating(review.self_review?.self_rating ?? null)}
          </div>
          <div>
            <span className="font-medium">Manager Rating:</span>{' '}
            {formatRating(review.manager_review?.rating ?? null)}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="finalRating">Final Rating * (1.0 - 5.0)</Label>
            <Input
              id="finalRating"
              type="number"
              min={RATING_SCALE.MIN}
              max={RATING_SCALE.MAX}
              step={RATING_SCALE.STEP}
              {...register('finalRating')}
            />
            {errors.finalRating && (
              <p className="text-sm text-destructive">{errors.finalRating.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Finalize Review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
