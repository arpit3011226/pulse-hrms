import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  createReimbursement,
  getMyReimbursements,
  getReimbursementsForApproval,
  getAllReimbursements,
  approveReimbursementManager,
  approveReimbursementFinance,
  rejectReimbursement,
} from '../api/reimbursement.api'
import type { CreateReimbursementData } from '../api/reimbursement.api'

export function useMyReimbursements(employeeId: string) {
  return useQuery({
    queryKey: ['my-reimbursements', employeeId],
    queryFn: () => getMyReimbursements(employeeId),
    enabled: !!employeeId,
  })
}

export function useReimbursementsForApproval() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['reimbursement-approvals', organization?.id],
    queryFn: () => getReimbursementsForApproval(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useAllReimbursements() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['all-reimbursements', organization?.id],
    queryFn: () => getAllReimbursements(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateReimbursement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateReimbursementData) => createReimbursement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reimbursements'] })
      queryClient.invalidateQueries({ queryKey: ['all-reimbursements'] })
      queryClient.invalidateQueries({ queryKey: ['reimbursement-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}

export function useApproveReimbursementManager() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, approverEmployeeId, remarks }: {
      requestId: string
      approverEmployeeId: string
      remarks?: string
    }) => approveReimbursementManager(requestId, approverEmployeeId, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursement-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['all-reimbursements'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}

export function useApproveReimbursementFinance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, approverEmployeeId, remarks }: {
      requestId: string
      approverEmployeeId: string
      remarks?: string
    }) => approveReimbursementFinance(requestId, approverEmployeeId, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursement-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['all-reimbursements'] })
      queryClient.invalidateQueries({ queryKey: ['my-reimbursements'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}

export function useRejectReimbursement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, rejectorEmployeeId, remarks, level }: {
      requestId: string
      rejectorEmployeeId: string
      remarks: string
      level: 'manager' | 'finance'
    }) => rejectReimbursement(requestId, rejectorEmployeeId, remarks, level),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursement-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['all-reimbursements'] })
      queryClient.invalidateQueries({ queryKey: ['my-reimbursements'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}
