import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import * as api from '../api/alumni.api'
import type { FinalSettlement } from '../api/alumni.api'

const bust = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['alumni'] })
  qc.invalidateQueries({ queryKey: ['settlements'] })
}

export function useSettlements() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['settlements', organization?.id],
    queryFn: () => api.getSettlements(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useUpsertSettlement() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (payload: Partial<FinalSettlement> & { id?: string }) =>
      api.upsertSettlement({ ...payload, organization_id: organization!.id }),
    onSuccess: () => bust(qc),
  })
}

export function useSetSettlementStatus() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.setSettlementStatus, onSuccess: () => bust(qc) })
}

export function useAlumni() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['alumni', 'directory', organization?.id],
    queryFn: () => api.getAlumni(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useExitRecords() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['alumni', 'exit-records', organization?.id],
    queryFn: () => api.getExitRecords(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useSetRehireEligibility() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.setRehireEligibility, onSuccess: () => bust(qc) })
}

export function useMarkAsAlumni() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.markAsAlumni, onSuccess: () => bust(qc) })
}

export function useExitQuestions() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['alumni', 'exit-questions', organization?.id],
    queryFn: () => api.getExitQuestions(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateExitQuestion() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.createExitQuestion({ ...payload, organization_id: organization!.id }),
    onSuccess: () => bust(qc),
  })
}

export function useExitResponses() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['alumni', 'exit-responses', organization?.id],
    queryFn: () => api.getExitResponses(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useSaveExitResponses() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (rows: Record<string, unknown>[]) =>
      api.saveExitResponses(rows.map((r) => ({ ...r, organization_id: organization!.id }))),
    onSuccess: () => bust(qc),
  })
}

/** F39 — an alumnus fetching their own records. */
export function useMyAlumniRecords(profileId: string | undefined) {
  return useQuery({
    queryKey: ['alumni', 'mine', profileId],
    queryFn: () => api.getMyAlumniRecords(profileId!),
    enabled: !!profileId,
  })
}
