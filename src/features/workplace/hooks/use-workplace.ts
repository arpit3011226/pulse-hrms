import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import * as api from '../api/workplace.api'
import type { TravelRequest } from '../api/workplace.api'

const bust = (qc: ReturnType<typeof useQueryClient>, key: string) =>
  qc.invalidateQueries({ queryKey: [key] })

// ── Travel ──────────────────────────────────────────────────────────────────
export function useTravelRequests() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['travel', organization?.id],
    queryFn: () => api.getTravelRequests(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateTravelRequest() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (p: Partial<TravelRequest>) =>
      api.createTravelRequest({ ...p, organization_id: organization!.id }),
    onSuccess: () => bust(qc, 'travel'),
  })
}

export function useUpdateTravelRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...u }: Partial<TravelRequest> & { id: string }) =>
      api.updateTravelRequest(id, u),
    onSuccess: () => bust(qc, 'travel'),
  })
}

// ── Recognition ─────────────────────────────────────────────────────────────
export function useRecognitions() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['recognitions', organization?.id],
    queryFn: () => api.getRecognitions(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useRecognitionValues() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['recognition-values', organization?.id],
    queryFn: () => api.getRecognitionValues(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useGiveRecognition() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (p: Record<string, unknown>) =>
      api.giveRecognition({ ...p, organization_id: organization!.id }),
    onSuccess: () => bust(qc, 'recognitions'),
  })
}

export function useToggleRecognitionReaction() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (p: {
      recognition_id: string
      employee_id: string
      emoji: string
      existingId: string | null
    }) => api.toggleRecognitionReaction({ ...p, organization_id: organization!.id }),
    onSuccess: () => bust(qc, 'recognitions'),
  })
}

export function useAddRecognitionComment() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (p: { recognition_id: string; employee_id: string; comment: string }) =>
      api.addRecognitionComment({ ...p, organization_id: organization!.id }),
    onSuccess: () => bust(qc, 'recognitions'),
  })
}

export function useDeleteRecognitionComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteRecognitionComment,
    onSuccess: () => bust(qc, 'recognitions'),
  })
}

export function useCreateRecognitionValue() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (p: Record<string, unknown>) =>
      api.createRecognitionValue({ ...p, organization_id: organization!.id }),
    onSuccess: () => bust(qc, 'recognition-values'),
  })
}

// ── Policies ────────────────────────────────────────────────────────────────
export function usePolicies() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['policies', organization?.id],
    queryFn: () => api.getPolicies(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreatePolicy() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (p: Record<string, unknown>) =>
      api.createPolicy({ ...p, organization_id: organization!.id }),
    onSuccess: () => bust(qc, 'policies'),
  })
}

export function useMyAcknowledgements(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['policy-acks', 'mine', employeeId],
    queryFn: () => api.getMyAcknowledgements(employeeId!),
    enabled: !!employeeId,
  })
}

export function useAllAcknowledgements() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['policy-acks', 'all', organization?.id],
    queryFn: () => api.getAllAcknowledgements(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useAcknowledgePolicy() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (p: { policy_id: string; employee_id: string; policy_version: string | null }) =>
      api.acknowledgePolicy({ ...p, organization_id: organization!.id }),
    onSuccess: () => bust(qc, 'policy-acks'),
  })
}

// ── Notification preferences ────────────────────────────────────────────────
export function useNotificationPreferences(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['notification-prefs', employeeId],
    queryFn: () => api.getNotificationPreferences(employeeId!),
    enabled: !!employeeId,
  })
}

export function useSaveNotificationPreference() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (p: {
      employee_id: string; category: string
      in_app: boolean; email: boolean; frequency: string
    }) => api.upsertNotificationPreference({ ...p, organization_id: organization!.id }),
    onSuccess: () => bust(qc, 'notification-prefs'),
  })
}

// ── DPDP ────────────────────────────────────────────────────────────────────
export function useDataRequests() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['data-requests', organization?.id],
    queryFn: () => api.getDataRequests(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateDataRequest() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (p: Record<string, unknown>) =>
      api.createDataRequest({ ...p, organization_id: organization!.id }),
    onSuccess: () => bust(qc, 'data-requests'),
  })
}

export function useUpdateDataRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...u }: Record<string, unknown> & { id: string }) =>
      api.updateDataRequest(id, u),
    onSuccess: () => bust(qc, 'data-requests'),
  })
}

// ── Audit ───────────────────────────────────────────────────────────────────
export function useAuditLog(limit = 200) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['audit-log', organization?.id, limit],
    queryFn: () => api.getAuditLog(organization!.id, limit),
    enabled: !!organization?.id,
  })
}
