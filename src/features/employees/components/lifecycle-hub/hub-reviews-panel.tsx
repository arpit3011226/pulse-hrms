import { Star } from 'lucide-react'
import { useActiveCycle, useMyReview } from '@/features/performance/hooks/use-performance'
import { StatusBadge } from '@/components/shared/status-badge'

interface HubReviewsPanelProps {
  employeeId: string
}

export function HubReviewsPanel({ employeeId }: HubReviewsPanelProps) {
  const { data: cycle } = useActiveCycle()
  const { data: review, isLoading } = useMyReview(employeeId, cycle?.id ?? '')

  if (isLoading) {
    return <div className="animate-pulse rounded-lg border bg-muted/30 p-6 h-20" />
  }

  if (!cycle) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
        No active performance cycle
      </div>
    )
  }

  const rev = review as typeof review & {
    status?: string
    self_rating?: number
    manager_rating?: number
    final_rating?: number
    rating_label?: string
  } | null

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{cycle.name}</p>
            <p className="text-xs text-muted-foreground">Performance cycle</p>
          </div>
          <StatusBadge status={cycle.status} />
        </div>
      </div>

      {rev ? (
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Review Status</p>
            <StatusBadge status={rev.status || 'pending'} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <RatingCard
              label="Self Review"
              rating={rev.self_rating ?? null}
              done={rev.status !== 'self_review_pending'}
            />
            <RatingCard
              label="Manager Review"
              rating={rev.manager_rating ?? null}
              done={['manager_review_done', 'finalized'].includes(rev.status || '')}
            />
          </div>

          {rev.final_rating && (
            <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
              <div>
                <p className="text-xs text-muted-foreground">Final Rating</p>
                <p className="font-bold text-foreground">{rev.rating_label || rev.final_rating}</p>
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.round(rev.final_rating!) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-4 text-center text-sm text-muted-foreground">
          No review initiated for this cycle
        </div>
      )}
    </div>
  )
}

function RatingCard({ label, rating, done }: { label: string; rating: number | null; done: boolean }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        {done ? (
          <>
            <span className="text-sm font-semibold">{rating ?? '-'}/5</span>
            <span className="text-[10px] text-emerald-600 font-medium">Completed</span>
          </>
        ) : (
          <span className="text-xs text-amber-600 font-medium">Pending</span>
        )}
      </div>
    </div>
  )
}
