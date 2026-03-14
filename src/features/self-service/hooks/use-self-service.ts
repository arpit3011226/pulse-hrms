import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  getLetterTemplates,
  createLetterTemplate,
  updateLetterTemplate,
  deleteLetterTemplate,
  requestLetter,
  getMyLetterRequests,
  getLetterRequestsForApproval,
  getAllLetterRequests,
  approveLetterManager,
  approveLetterHR,
  rejectLetter,
  type RequestLetterData,
} from '../api/self-service.api'
import type { LetterTemplate } from '@/types/database.types'

// ── Templates ──

export function useLetterTemplates() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['letter-templates', organization?.id],
    queryFn: () => getLetterTemplates(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<LetterTemplate, 'id' | 'created_at' | 'updated_at'>) => createLetterTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letter-templates'] })
    },
  })
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LetterTemplate> }) => updateLetterTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letter-templates'] })
    },
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLetterTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letter-templates'] })
    },
  })
}

// ── Letter Requests ──

export function useMyLetterRequests(employeeId: string) {
  return useQuery({
    queryKey: ['my-letter-requests', employeeId],
    queryFn: () => getMyLetterRequests(employeeId),
    enabled: !!employeeId,
  })
}

export function useLetterRequestsForApproval() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['letter-approvals', organization?.id],
    queryFn: () => getLetterRequestsForApproval(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useAllLetterRequests() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['all-letter-requests', organization?.id],
    queryFn: () => getAllLetterRequests(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useRequestLetter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: RequestLetterData) => requestLetter(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-letter-requests'] })
      queryClient.invalidateQueries({ queryKey: ['all-letter-requests'] })
      queryClient.invalidateQueries({ queryKey: ['letter-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}

export function useApproveLetterManager() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, approverEmployeeId, remarks }: {
      requestId: string
      approverEmployeeId: string
      remarks?: string
    }) => approveLetterManager(requestId, approverEmployeeId, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letter-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['all-letter-requests'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}

export function useApproveLetterHR() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, approverEmployeeId, remarks }: {
      requestId: string
      approverEmployeeId: string
      remarks?: string
    }) => approveLetterHR(requestId, approverEmployeeId, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letter-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['all-letter-requests'] })
      queryClient.invalidateQueries({ queryKey: ['my-letter-requests'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}

export function useRejectLetter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, rejectorEmployeeId, remarks, level }: {
      requestId: string
      rejectorEmployeeId: string
      remarks: string
      level: 'manager' | 'hr'
    }) => rejectLetter(requestId, rejectorEmployeeId, remarks, level),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letter-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['all-letter-requests'] })
      queryClient.invalidateQueries({ queryKey: ['my-letter-requests'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}
