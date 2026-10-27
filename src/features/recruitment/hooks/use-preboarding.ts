import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import * as api from '../api/preboarding.api'

function bust(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['preboarding'] })
}

export function useDocumentRequirements() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['preboarding', 'requirements', organization?.id],
    queryFn: () => api.getDocumentRequirements(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useSaveDocumentRequirement() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.saveDocumentRequirement, onSuccess: () => bust(qc) })
}

export function useCandidateChecklists(candidateId: string | undefined) {
  return useQuery({
    queryKey: ['preboarding', 'candidate', candidateId],
    queryFn: () => api.getChecklistsForCandidate(candidateId!),
    enabled: !!candidateId,
  })
}

export function useOpenChecklists() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['preboarding', 'open', organization?.id],
    queryFn: () => api.getOpenChecklists(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useSendChecklist() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.sendChecklist, onSuccess: () => bust(qc) })
}

/** The candidate's own list, on the portal. */
export function useMyChecklists(enabled: boolean) {
  return useQuery({
    queryKey: ['preboarding', 'mine'],
    queryFn: api.getMyChecklists,
    enabled,
  })
}

export function useUploadCandidateDocument() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.uploadCandidateDocument, onSuccess: () => bust(qc) })
}

export function useReviewDocument() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.reviewDocument, onSuccess: () => bust(qc) })
}

export function useApproveChecklist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ checklistId, reviewerProfileId }: { checklistId: string; reviewerProfileId: string }) =>
      api.approveChecklist(checklistId, reviewerProfileId),
    onSuccess: () => bust(qc),
  })
}
