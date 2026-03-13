import { useState } from 'react'
import { Loader2, User, Users, ArrowUpRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import {
  useCurrentEmployee,
  useActiveCycle,
  useMyReview,
  useReviewParticipants,
  useUpdatePerformanceReviewStatus,
} from '../hooks/use-performance'
import { formatRating, getReviewStatusStep } from '../utils/performance-utils'
import { SelfReviewDialog } from './self-review-dialog'
import { PeerReviewDialog } from './peer-review-dialog'
import type { ReviewParticipantWithRelations } from '@/types/database.types'
import { toast } from 'sonner'

const TYPE_COLORS: Record<string, string> = {
  self: 'bg-blue-100 text-blue-700',
  manager: 'bg-purple-100 text-purple-700',
  peer: 'bg-orange-100 text-orange-700',
  skip_level: 'bg-teal-100 text-teal-700',
}

const TYPE_LABELS: Record<string, string> = {
  self: 'Self Assessment',
  manager: 'Manager Review',
  peer: 'Peer Review',
  skip_level: 'Skip-Level Review',
}

function getInitials(firstName?: string, lastName?: string) {
  return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase()
}

interface CircularProgressProps {
  completed: number
  total: number
  size?: number
}

function CircularProgress({ completed, total, size = 80 }: CircularProgressProps) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? completed / total : 0
  const offset = circumference - progress * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-orange-500 transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold">
          {completed}/{total}
        </span>
      </div>
    </div>
  )
}

export function Review360View() {
  const { data: employee, isLoading: empLoading } = useCurrentEmployee()
  const { data: activeCycle, isLoading: cycleLoading } = useActiveCycle()
  const { data: review, isLoading: reviewLoading } = useMyReview(
    employee?.id || '',
    activeCycle?.id || ''
  )
  const { data: participants, isLoading: participantsLoading } = useReviewParticipants(
    review?.id || ''
  )
  const updateStatus = useUpdatePerformanceReviewStatus()

  const [selfReviewOpen, setSelfReviewOpen] = useState(false)
  const [peerReviewOpen, setPeerReviewOpen] = useState(false)
  const [peerReviewForId, setPeerReviewForId] = useState('')

  const isLoading = empLoading || cycleLoading || reviewLoading || participantsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!activeCycle) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No active performance cycle found.
        </CardContent>
      </Card>
    )
  }

  if (!employee) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Unable to identify your employee record.
        </CardContent>
      </Card>
    )
  }

  if (!review) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No review found for the current cycle: {activeCycle.cycle_name}
        </CardContent>
      </Card>
    )
  }

  const participantList = (participants || []) as ReviewParticipantWithRelations[]
  const totalParticipants = participantList.length
  const completedParticipants = participantList.filter((p) => p.status === 'submitted').length

  const canSubmitSelfReview =
    review.status === 'self_review_pending' || review.status === 'draft'
  const canAcknowledge = review.status === 'manager_review_done'
  const isFinalized = review.status === 'finalized'

  const handleAcknowledge = async () => {
    try {
      await updateStatus.mutateAsync({ id: review.id, status: 'acknowledged' })
      toast.success('Review acknowledged')
    } catch {
      toast.error('Failed to acknowledge review')
    }
  }

  const handleOpenPeerReview = (reviewId: string) => {
    setPeerReviewForId(reviewId)
    setPeerReviewOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* 360 Review Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-orange-100 text-orange-700 font-semibold">
                  {getInitials(employee.first_name, employee.last_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">
                  360° Review — {employee.first_name} {employee.last_name}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {activeCycle.cycle_name} • {employee.employee_code}
                </p>
              </div>
            </div>
            <CircularProgress completed={completedParticipants} total={totalParticipants} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Completion bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-muted-foreground">Completion</span>
              <span className="text-sm font-semibold">
                {completedParticipants}/{totalParticipants}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                style={{
                  width: `${totalParticipants > 0 ? (completedParticipants / totalParticipants) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Reviewer rows */}
          <div className="space-y-2">
            {participantList.map((participant) => {
              const reviewer = participant.reviewer
              const isSubmitted = participant.status === 'submitted'
              const typeColor = TYPE_COLORS[participant.reviewer_type] || 'bg-gray-100 text-gray-700'
              const typeLabel = TYPE_LABELS[participant.reviewer_type] || participant.reviewer_type
              const isSelf = participant.reviewer_type === 'self'
              const isPeerByCurrentUser =
                participant.reviewer_type === 'peer' &&
                participant.reviewer_id === employee.id

              return (
                <div
                  key={participant.id}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-4 py-3 transition-colors',
                    isSubmitted ? 'bg-white border' : 'bg-orange-50/60 border border-orange-200/50'
                  )}
                >
                  {/* Avatar */}
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarFallback className={cn('text-xs font-semibold', typeColor)}>
                      {reviewer ? getInitials(reviewer.first_name, reviewer.last_name) : (
                        participant.reviewer_type === 'self' ? <User className="h-4 w-4" /> :
                        participant.reviewer_type === 'peer' ? <Users className="h-4 w-4" /> :
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded', typeColor)}>
                        {typeLabel}
                      </span>
                    </div>
                    <p className="text-sm font-medium mt-0.5 truncate">
                      {reviewer
                        ? `${reviewer.first_name} ${reviewer.last_name}`
                        : 'Unassigned'}
                    </p>
                  </div>

                  {/* Status badge */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        isSubmitted
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-orange-100 text-orange-700'
                      )}
                    >
                      {isSubmitted ? 'Submitted' : 'Pending'}
                    </span>

                    {/* Action buttons */}
                    {!isSubmitted && isSelf && canSubmitSelfReview && (
                      <Button size="sm" variant="outline" onClick={() => setSelfReviewOpen(true)}>
                        Submit
                      </Button>
                    )}
                    {!isSubmitted && isPeerByCurrentUser && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenPeerReview(review.id)}
                      >
                        Submit
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}

            {participantList.length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No review participants assigned yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Final Rating */}
      {isFinalized && review.final_rating !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Final Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-orange-600">
                {formatRating(review.final_rating)}
              </span>
              <span className="text-sm text-muted-foreground">/5.0</span>
            </div>
            {review.overall_comments && (
              <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
                {review.overall_comments}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Acknowledge Button */}
      {canAcknowledge && (
        <div className="flex justify-end">
          <Button onClick={handleAcknowledge} disabled={updateStatus.isPending}>
            {updateStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Acknowledge Review
          </Button>
        </div>
      )}

      {/* Self Review Dialog */}
      <SelfReviewDialog
        open={selfReviewOpen}
        onOpenChange={setSelfReviewOpen}
        reviewId={review.id}
        existing={review.self_review}
      />

      {/* Peer Review Dialog */}
      <PeerReviewDialog
        open={peerReviewOpen}
        onOpenChange={setPeerReviewOpen}
        reviewId={peerReviewForId}
        peerId={employee.id}
      />
    </div>
  )
}
