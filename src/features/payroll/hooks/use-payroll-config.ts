import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import type { PayrollConfig } from '@/types/database.types'
import {
  getPayrollConfig,
  updatePayrollConfig,
  getPayrollApprovals,
  submitForApproval,
  approvePayroll,
  rejectPayroll,
} from '../api/payroll-config.api'

// ============================================
// Payroll Config
// ============================================

export function usePayrollConfig() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['payroll-config', organization?.id],
    queryFn: () => getPayrollConfig(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useUpdatePayrollConfig() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (updates: Partial<PayrollConfig>) =>
      updatePayrollConfig(organization!.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-config'] })
    },
  })
}

// ============================================
// Payroll Approvals
// ============================================

export function usePayrollApprovals(cycleId: string) {
  return useQuery({
    queryKey: ['payroll-approvals', cycleId],
    queryFn: () => getPayrollApprovals(cycleId),
    enabled: !!cycleId,
  })
}

export function useSubmitForApproval() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: ({ cycleId, submittedBy }: { cycleId: string; submittedBy: string }) =>
      submitForApproval(cycleId, organization!.id, submittedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-approvals'] })
    },
  })
}

export function useApprovePayrollCycle() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: ({
      cycleId,
      level,
      approverId,
      remarks,
    }: {
      cycleId: string
      level: 1 | 2
      approverId: string
      remarks?: string
    }) => approvePayroll(cycleId, organization!.id, level, approverId, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-approvals'] })
    },
  })
}

export function useRejectPayrollCycle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      cycleId,
      level,
      approverId,
      remarks,
    }: {
      cycleId: string
      level: 1 | 2
      approverId: string
      remarks: string
    }) => rejectPayroll(cycleId, level, approverId, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-approvals'] })
    },
  })
}
