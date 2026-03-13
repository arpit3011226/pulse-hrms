import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import type {
  PerformanceCycle,
  ReviewCompetency,
  EmployeeGoal,
  GoalKeyResult,
  GoalCheckin,
  PerformanceReview,
  SelfReview,
  ManagerReview,
  PerformanceImprovementPlan,
  PeerReview,
  SkipLevelReview,
  ReviewParticipant,
} from '@/types/database.types'
import {
  getPerformanceCycles,
  getActiveCycle,
  createPerformanceCycle,
  updatePerformanceCycle,
  updateCycleStatus,
  deletePerformanceCycle,
  getReviewCompetencies,
  createReviewCompetency,
  updateReviewCompetency,
  deleteReviewCompetency,
  getEmployeeGoals,
  getMyGoals,
  createEmployeeGoal,
  updateEmployeeGoal,
  deleteEmployeeGoal,
  upsertGoalKeyResults,
  getGoalCheckins,
  createGoalCheckin,
  getPerformanceReviews,
  getMyReview,
  getTeamReviews,
  createPerformanceReview,
  updatePerformanceReviewStatus,
  submitSelfReview,
  submitManagerReview,
  finalizeReview,
  initiateCycleReviews,
  getPerformanceImprovementPlans,
  createPIP,
  updatePIP,
  updatePIPStatus,
  getCurrentEmployee,
  getReviewParticipants,
  addReviewParticipant,
  removeReviewParticipant,
  getPeerReviews,
  submitPeerReview,
  getSkipLevelReview,
  submitSkipLevelReview,
  getOrganizationGoals,
  getGoalHierarchy,
  getTeamGoals,
  createGoalForEmployee,
  getSkippedEmployees,
  manuallyIncludeEmployee,
  manuallyExcludeEmployee,
  getPerformanceAnalytics,
  getRatingTrend,
} from '../api/performance.api'

// ============================================
// Current Employee Hook
// ============================================

export function useCurrentEmployee() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['current-employee', profile?.id],
    queryFn: () => getCurrentEmployee(profile!.id),
    enabled: !!profile?.id,
  })
}

// ============================================
// Performance Cycles
// ============================================

export function usePerformanceCycles() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['performance-cycles', organization?.id],
    queryFn: () => getPerformanceCycles(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useActiveCycle() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['active-cycle', organization?.id],
    queryFn: () => getActiveCycle(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreatePerformanceCycle() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<PerformanceCycle>) =>
      createPerformanceCycle({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-cycles'] })
    },
  })
}

export function useUpdatePerformanceCycle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<PerformanceCycle> & { id: string }) =>
      updatePerformanceCycle(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-cycles'] })
    },
  })
}

export function useUpdateCycleStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateCycleStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-cycles'] })
      queryClient.invalidateQueries({ queryKey: ['active-cycle'] })
    },
  })
}

export function useDeletePerformanceCycle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deletePerformanceCycle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-cycles'] })
    },
  })
}

// ============================================
// Review Competencies
// ============================================

export function useReviewCompetencies() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['review-competencies', organization?.id],
    queryFn: () => getReviewCompetencies(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateReviewCompetency() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<ReviewCompetency>) =>
      createReviewCompetency({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-competencies'] })
    },
  })
}

export function useUpdateReviewCompetency() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<ReviewCompetency> & { id: string }) =>
      updateReviewCompetency(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-competencies'] })
    },
  })
}

export function useDeleteReviewCompetency() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteReviewCompetency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-competencies'] })
    },
  })
}

// ============================================
// Employee Goals
// ============================================

export function useEmployeeGoals(cycleId?: string) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['employee-goals', organization?.id, cycleId],
    queryFn: () => getEmployeeGoals(organization!.id, cycleId),
    enabled: !!organization?.id,
  })
}

export function useMyGoals(employeeId: string, cycleId?: string) {
  return useQuery({
    queryKey: ['my-goals', employeeId, cycleId],
    queryFn: () => getMyGoals(employeeId, cycleId),
    enabled: !!employeeId,
  })
}

export function useCreateEmployeeGoal() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<EmployeeGoal>) =>
      createEmployeeGoal({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-goals'] })
      queryClient.invalidateQueries({ queryKey: ['my-goals'] })
    },
  })
}

export function useUpdateEmployeeGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<EmployeeGoal> & { id: string }) =>
      updateEmployeeGoal(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-goals'] })
      queryClient.invalidateQueries({ queryKey: ['my-goals'] })
    },
  })
}

export function useDeleteEmployeeGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteEmployeeGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-goals'] })
      queryClient.invalidateQueries({ queryKey: ['my-goals'] })
    },
  })
}

export function useUpsertGoalKeyResults() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ goalId, keyResults }: { goalId: string; keyResults: Partial<GoalKeyResult>[] }) =>
      upsertGoalKeyResults(goalId, keyResults),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-goals'] })
      queryClient.invalidateQueries({ queryKey: ['my-goals'] })
    },
  })
}

export function useGoalCheckins(goalId: string) {
  return useQuery({
    queryKey: ['goal-checkins', goalId],
    queryFn: () => getGoalCheckins(goalId),
    enabled: !!goalId,
  })
}

export function useCreateGoalCheckin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<GoalCheckin>) => createGoalCheckin(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-checkins'] })
      queryClient.invalidateQueries({ queryKey: ['my-goals'] })
      queryClient.invalidateQueries({ queryKey: ['employee-goals'] })
    },
  })
}

// ============================================
// Performance Reviews
// ============================================

export function usePerformanceReviews(cycleId?: string) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['performance-reviews', organization?.id, cycleId],
    queryFn: () => getPerformanceReviews(organization!.id, cycleId),
    enabled: !!organization?.id,
  })
}

export function useMyReview(employeeId: string, cycleId: string) {
  return useQuery({
    queryKey: ['my-review', employeeId, cycleId],
    queryFn: () => getMyReview(employeeId, cycleId),
    enabled: !!employeeId && !!cycleId,
  })
}

export function useTeamReviews(reviewerId: string, cycleId?: string) {
  return useQuery({
    queryKey: ['team-reviews', reviewerId, cycleId],
    queryFn: () => getTeamReviews(reviewerId, cycleId),
    enabled: !!reviewerId,
  })
}

export function useCreatePerformanceReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<PerformanceReview>) => createPerformanceReview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] })
    },
  })
}

export function useUpdatePerformanceReviewStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updatePerformanceReviewStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] })
    },
  })
}

export function useSubmitSelfReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<SelfReview>) => submitSelfReview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-review'] })
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] })
    },
  })
}

export function useSubmitManagerReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<ManagerReview>) => submitManagerReview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] })
    },
  })
}

export function useFinalizeReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ reviewId, finalRating, ratingLabel }: { reviewId: string; finalRating: number; ratingLabel: string }) =>
      finalizeReview(reviewId, finalRating, ratingLabel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] })
    },
  })
}

export function useInitiateCycleReviews() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (cycleId: string) => initiateCycleReviews(cycleId, organization!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['performance-cycles'] })
    },
  })
}

// ============================================
// Performance Improvement Plans (PIPs)
// ============================================

export function usePerformanceImprovementPlans() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['pips', organization?.id],
    queryFn: () => getPerformanceImprovementPlans(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreatePIP() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<PerformanceImprovementPlan>) =>
      createPIP({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pips'] })
    },
  })
}

export function useUpdatePIP() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<PerformanceImprovementPlan> & { id: string }) =>
      updatePIP(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pips'] })
    },
  })
}

export function useUpdatePIPStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updatePIPStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pips'] })
    },
  })
}

// ============================================
// 360 Review: Participants & Peer Reviews
// ============================================

export function useReviewParticipants(reviewId: string) {
  return useQuery({
    queryKey: ['review-participants', reviewId],
    queryFn: () => getReviewParticipants(reviewId),
    enabled: !!reviewId,
  })
}

export function useAddReviewParticipant() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<ReviewParticipant>) =>
      addReviewParticipant({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-participants'] })
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['my-review'] })
      queryClient.invalidateQueries({ queryKey: ['team-reviews'] })
    },
  })
}

export function useRemoveReviewParticipant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reviewId, reviewerId, reviewerType }: { id: string; reviewId: string; reviewerId: string; reviewerType: string }) =>
      removeReviewParticipant(id, reviewId, reviewerId, reviewerType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-participants'] })
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] })
    },
  })
}

export function usePeerReviews(reviewId: string) {
  return useQuery({
    queryKey: ['peer-reviews', reviewId],
    queryFn: () => getPeerReviews(reviewId),
    enabled: !!reviewId,
  })
}

export function useSubmitPeerReview() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<PeerReview>) =>
      submitPeerReview({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peer-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['review-participants'] })
      queryClient.invalidateQueries({ queryKey: ['my-review'] })
    },
  })
}

export function useSkipLevelReview(reviewId: string) {
  return useQuery({
    queryKey: ['skip-level-review', reviewId],
    queryFn: () => getSkipLevelReview(reviewId),
    enabled: !!reviewId,
  })
}

export function useSubmitSkipLevelReview() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<SkipLevelReview>) =>
      submitSkipLevelReview({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skip-level-review'] })
      queryClient.invalidateQueries({ queryKey: ['review-participants'] })
    },
  })
}

// ============================================
// OKR Goals: Organization & Team
// ============================================

export function useOrganizationGoals(cycleId?: string) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['org-goals', organization?.id, cycleId],
    queryFn: () => getOrganizationGoals(organization!.id, cycleId),
    enabled: !!organization?.id,
  })
}

export function useGoalHierarchy(parentGoalId: string) {
  return useQuery({
    queryKey: ['goal-hierarchy', parentGoalId],
    queryFn: () => getGoalHierarchy(parentGoalId),
    enabled: !!parentGoalId,
  })
}

export function useTeamGoals(managerId: string, cycleId?: string) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['team-goals', managerId, organization?.id, cycleId],
    queryFn: () => getTeamGoals(managerId, organization!.id, cycleId),
    enabled: !!managerId && !!organization?.id,
  })
}

export function useCreateGoalForEmployee() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<EmployeeGoal>) =>
      createGoalForEmployee({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-goals'] })
      queryClient.invalidateQueries({ queryKey: ['my-goals'] })
      queryClient.invalidateQueries({ queryKey: ['team-goals'] })
      queryClient.invalidateQueries({ queryKey: ['org-goals'] })
    },
  })
}

// ============================================
// Skipped Employees
// ============================================

export function useSkippedEmployees(cycleId: string) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['skipped-employees', cycleId, organization?.id],
    queryFn: () => getSkippedEmployees(cycleId, organization!.id),
    enabled: !!cycleId && !!organization?.id,
  })
}

export function useManuallyIncludeEmployee() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: ({ cycleId, employeeId }: { cycleId: string; employeeId: string }) =>
      manuallyIncludeEmployee(cycleId, employeeId, organization!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skipped-employees'] })
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] })
    },
  })
}

export function useManuallyExcludeEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reviewId: string) => manuallyExcludeEmployee(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skipped-employees'] })
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] })
    },
  })
}

// ============================================
// Performance Analytics
// ============================================

export function usePerformanceAnalytics(cycleId: string, teamManagerId?: string) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['performance-analytics', organization?.id, cycleId, teamManagerId],
    queryFn: () => getPerformanceAnalytics(organization!.id, cycleId, teamManagerId),
    enabled: !!organization?.id && !!cycleId,
  })
}

export function useRatingTrend(teamManagerId?: string) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['rating-trend', organization?.id, teamManagerId],
    queryFn: () => getRatingTrend(organization!.id, teamManagerId),
    enabled: !!organization?.id,
  })
}
