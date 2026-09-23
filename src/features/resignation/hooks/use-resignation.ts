import { useApprovalScope } from '@/features/settings/hooks/use-delegation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  submitResignation,
  getResignationRequests,
  getMyResignation,
  getPendingManagerApprovals,
  getPendingHRApprovals,
  approveResignationManager,
  approveResignationHR,
  rejectResignation,
  withdrawResignation,
  type SubmitResignationData,
  type ResignationFilters,
} from '../api/resignation.api'

// ============================================================================
// MY RESIGNATION
// ============================================================================

export function useMyResignation(employeeId: string) {
  return useQuery({
    queryKey: ['my-resignation', employeeId],
    queryFn: () => getMyResignation(employeeId),
    enabled: !!employeeId,
  })
}

// ============================================================================
// RESIGNATION REQUESTS (all for org)
// ============================================================================

export function useResignationRequests(filters?: ResignationFilters) {
  const { organization } = useAuth()

  return useQuery({
    queryKey: ['resignation-requests', organization?.id, filters],
    queryFn: () => getResignationRequests(organization!.id, filters),
    enabled: !!organization?.id,
  })
}

// ============================================================================
// PENDING MANAGER APPROVALS
// ============================================================================

export function usePendingManagerApprovals(managerId: string) {
  // F44 — include anyone currently delegating their approvals to this user
  const { approverIds } = useApprovalScope(managerId || undefined)
  return useQuery({
    queryKey: ['pending-manager-approvals', approverIds],
    queryFn: () => getPendingManagerApprovals(approverIds),
    enabled: approverIds.length > 0,
  })
}

// ============================================================================
// PENDING HR APPROVALS
// ============================================================================

export function usePendingHRApprovals() {
  const { organization } = useAuth()

  return useQuery({
    queryKey: ['pending-hr-approvals', organization?.id],
    queryFn: () => getPendingHRApprovals(organization!.id),
    enabled: !!organization?.id,
  })
}

// ============================================================================
// SUBMIT RESIGNATION
// ============================================================================

export function useSubmitResignation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SubmitResignationData) => submitResignation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-resignation'] })
      queryClient.invalidateQueries({ queryKey: ['resignation-requests'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}

// ============================================================================
// APPROVE RESIGNATION — MANAGER
// ============================================================================

export function useApproveResignationManager() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      exitRecordId,
      approverEmployeeId,
      remarks,
    }: {
      exitRecordId: string
      approverEmployeeId: string
      remarks?: string
    }) => approveResignationManager(exitRecordId, approverEmployeeId, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-manager-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['resignation-requests'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}

// ============================================================================
// APPROVE RESIGNATION — HR
// ============================================================================

export function useApproveResignationHR() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      exitRecordId,
      approverEmployeeId,
      remarks,
      overrideLastWorkingDate,
    }: {
      exitRecordId: string
      approverEmployeeId: string
      remarks?: string
      overrideLastWorkingDate?: string
    }) => approveResignationHR(exitRecordId, approverEmployeeId, remarks, overrideLastWorkingDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-hr-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['resignation-requests'] })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}

// ============================================================================
// REJECT RESIGNATION
// ============================================================================

export function useRejectResignation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      exitRecordId,
      rejectorEmployeeId,
      remarks,
      level,
    }: {
      exitRecordId: string
      rejectorEmployeeId: string
      remarks: string
      level: 'manager' | 'hr'
    }) => rejectResignation(exitRecordId, rejectorEmployeeId, remarks, level),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-resignation'] })
      queryClient.invalidateQueries({ queryKey: ['resignation-requests'] })
      queryClient.invalidateQueries({ queryKey: ['pending-manager-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['pending-hr-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}

// ============================================================================
// WITHDRAW RESIGNATION
// ============================================================================

export function useWithdrawResignation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (exitRecordId: string) => withdrawResignation(exitRecordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-resignation'] })
      queryClient.invalidateQueries({ queryKey: ['resignation-requests'] })
    },
  })
}
