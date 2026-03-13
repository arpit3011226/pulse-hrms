import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  on_notice: 'bg-amber-100 text-amber-700 border-amber-200',
  terminated: 'bg-red-100 text-red-700 border-red-200',
  resigned: 'bg-gray-100 text-gray-700 border-gray-200',
  on_leave: 'bg-blue-100 text-blue-700 border-blue-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-700 border-gray-200',
  present: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  absent: 'bg-red-100 text-red-700 border-red-200',
  half_day: 'bg-amber-100 text-amber-700 border-amber-200',
  holiday: 'bg-blue-100 text-blue-700 border-blue-200',
  weekend: 'bg-gray-100 text-gray-700 border-gray-200',
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  open: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  closed: 'bg-red-100 text-red-700 border-red-200',
  full_time: 'bg-blue-100 text-blue-700 border-blue-200',
  part_time: 'bg-purple-100 text-purple-700 border-purple-200',
  contract: 'bg-orange-100 text-orange-700 border-orange-200',
  intern: 'bg-pink-100 text-pink-700 border-pink-200',
  processing: 'bg-blue-100 text-blue-700 border-blue-200',
  computed: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  // Performance review statuses
  self_review_pending: 'bg-amber-100 text-amber-700 border-amber-200',
  self_review_done: 'bg-blue-100 text-blue-700 border-blue-200',
  manager_review_pending: 'bg-orange-100 text-orange-700 border-orange-200',
  manager_review_done: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  acknowledged: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  finalized: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  // Recruitment statuses
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  screening: 'bg-amber-100 text-amber-700 border-amber-200',
  in_progress: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  offer: 'bg-purple-100 text-purple-700 border-purple-200',
  hired: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  withdrawn: 'bg-gray-100 text-gray-700 border-gray-200',
  on_hold: 'bg-amber-100 text-amber-700 border-amber-200',
  filled: 'bg-purple-100 text-purple-700 border-purple-200',
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  rescheduled: 'bg-amber-100 text-amber-700 border-amber-200',
  no_show: 'bg-red-100 text-red-700 border-red-200',
  sent: 'bg-blue-100 text-blue-700 border-blue-200',
  accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  expired: 'bg-amber-100 text-amber-700 border-amber-200',
  // Learning & Development statuses
  enrolled: 'bg-blue-100 text-blue-700 border-blue-200',
  published: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  archived: 'bg-gray-100 text-gray-700 border-gray-200',
  dropped: 'bg-gray-100 text-gray-700 border-gray-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  passed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = statusColors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  const label = status.replace(/_/g, ' ')

  return (
    <Badge variant="outline" className={cn('capitalize', colorClass, className)}>
      {label}
    </Badge>
  )
}
