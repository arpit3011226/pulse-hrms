import { RATING_LABELS } from '@/lib/constants'
import type { EmployeeGoal, GoalKeyResult, PerformanceCycle } from '@/types/database.types'

export function getRatingLabel(rating: number): string {
  const match = RATING_LABELS.find((r) => rating >= r.min && rating <= r.max)
  return match?.label ?? 'N/A'
}

export function getRatingColor(rating: number): string {
  if (rating >= 4.5) return 'text-green-600'
  if (rating >= 3.0) return 'text-blue-600'
  if (rating >= 2.0) return 'text-yellow-600'
  return 'text-red-600'
}

export function getRatingBgColor(rating: number): string {
  if (rating >= 4.5) return 'bg-green-50 text-green-700'
  if (rating >= 3.0) return 'bg-blue-50 text-blue-700'
  if (rating >= 2.0) return 'bg-yellow-50 text-yellow-700'
  return 'bg-red-50 text-red-700'
}

export function formatRating(rating: number | null): string {
  if (rating === null || rating === undefined) return '-'
  return `${rating.toFixed(1)} / 5.0`
}

export function calculateGoalProgress(goal: EmployeeGoal): number {
  if (!goal.target_value || goal.target_value === 0) {
    if (goal.unit === 'boolean') return goal.current_value > 0 ? 100 : 0
    return 0
  }
  return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
}

export function calculateOverallGoalProgress(goals: EmployeeGoal[]): number {
  if (goals.length === 0) return 0
  const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0)
  if (totalWeightage === 0) return 0
  const weightedProgress = goals.reduce(
    (sum, g) => sum + calculateGoalProgress(g) * g.weightage,
    0
  )
  return Math.round(weightedProgress / totalWeightage)
}

export function calculateKeyResultProgress(keyResults: GoalKeyResult[]): number {
  if (keyResults.length === 0) return 0
  const totalWeightage = keyResults.reduce((sum, kr) => sum + kr.weightage, 0)
  if (totalWeightage === 0) return 0
  const weightedProgress = keyResults.reduce((sum, kr) => {
    const progress = kr.target_value > 0
      ? Math.min(100, Math.round((kr.current_value / kr.target_value) * 100))
      : 0
    return sum + progress * kr.weightage
  }, 0)
  return Math.round(weightedProgress / totalWeightage)
}

export function validateGoalWeightages(goals: { weightage: number }[]): { valid: boolean; total: number } {
  const total = goals.reduce((sum, g) => sum + g.weightage, 0)
  return { valid: Math.abs(total - 100) < 0.01, total }
}

export function getReviewStatusStep(status: string): number {
  const steps: Record<string, number> = {
    draft: 0,
    self_review_pending: 1,
    self_review_done: 2,
    manager_review_pending: 3,
    manager_review_done: 4,
    acknowledged: 5,
    finalized: 6,
  }
  return steps[status] ?? 0
}

export function getGoalStatusColor(status: string): string {
  const colors: Record<string, string> = {
    not_started: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-50 text-blue-700',
    on_track: 'bg-green-50 text-green-700',
    at_risk: 'bg-yellow-50 text-yellow-700',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-50 text-red-700',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-700'
}

export function getCyclePhase(cycle: PerformanceCycle): string {
  const now = new Date()
  if (cycle.status === 'draft' || cycle.status === 'cancelled' || cycle.status === 'completed') {
    return cycle.status
  }
  if (cycle.goal_setting_deadline && now <= new Date(cycle.goal_setting_deadline)) {
    return 'goal_setting'
  }
  if (cycle.self_review_deadline && now <= new Date(cycle.self_review_deadline)) {
    return 'self_review'
  }
  if (cycle.manager_review_deadline && now <= new Date(cycle.manager_review_deadline)) {
    return 'manager_review'
  }
  return 'calibration'
}

export function isCycleDeadlinePassed(deadline: string | null): boolean {
  if (!deadline) return false
  return new Date() > new Date(deadline)
}
