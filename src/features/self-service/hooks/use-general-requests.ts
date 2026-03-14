import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  createGeneralRequest,
  getMyGeneralRequests,
  getGeneralRequestsForApproval,
  getAllGeneralRequests,
  approveGeneralRequestManager,
  approveGeneralRequestHR,
  rejectGeneralRequest,
} from '../api/general-request.api'
import type { CreateGeneralRequestData } from '../api/general-request.api'

export function useMyGeneralRequests(employeeId: string) {
  return useQuery({
    queryKey: ['my-general-requests', employeeId],
    queryFn: () => getMyGeneralRequests(employeeId),
    enabled: !!employeeId,
  })
}

export function useGeneralRequestsForApproval() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['general-request-approvals', organization?.id],
    queryFn: () => getGeneralRequestsForApproval(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useAllGeneralRequests() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['all-general-requests', organization?.id],
    queryFn: () => getAllGeneralRequests(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateGeneralRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGeneralRequestData) => createGeneralRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-general-requests'] })
      queryClient.invalidateQueries({ queryKey: ['all-general-requests'] })
      queryClient.invalidateQueries({ queryKey: ['general-request-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}

export function useApproveGeneralRequestManager() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, approverEmployeeId, remarks }: {
      requestId: string
      approverEmployeeId: string
      remarks?: string
    }) => approveGeneralRequestManager(requestId, approverEmployeeId, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['general-request-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['all-general-requests'] })
      queryClient.invalidateQueries({ queryKey: ['my-general-requests'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}

export function useApproveGeneralRequestHR() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, approverEmployeeId, remarks }: {
      requestId: string
      approverEmployeeId: string
      remarks?: string
    }) => approveGeneralRequestHR(requestId, approverEmployeeId, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['general-request-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['all-general-requests'] })
      queryClient.invalidateQueries({ queryKey: ['my-general-requests'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}

export function useRejectGeneralRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, rejectorEmployeeId, remarks, level }: {
      requestId: string
      rejectorEmployeeId: string
      remarks: string
      level: 'manager' | 'hr'
    }) => rejectGeneralRequest(requestId, rejectorEmployeeId, remarks, level),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['general-request-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['all-general-requests'] })
      queryClient.invalidateQueries({ queryKey: ['my-general-requests'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}
