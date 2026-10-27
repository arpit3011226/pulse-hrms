import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import * as api from '../api/agreements.api'

function bust(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['agreements'] })
}

export function useAgreementTemplates() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['agreements', 'templates', organization?.id],
    queryFn: () => api.getAgreementTemplates(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useSaveAgreementTemplate() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.saveAgreementTemplate, onSuccess: () => bust(qc) })
}

export function useMyAgreements(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['agreements', 'mine', employeeId],
    queryFn: () => api.getMyAgreements(employeeId!),
    enabled: !!employeeId,
  })
}

export function useAgreementsForEmployee(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['agreements', 'employee', employeeId],
    queryFn: () => api.getAgreementsForEmployee(employeeId!),
    enabled: !!employeeId,
  })
}

export function useOutstandingAgreements() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['agreements', 'outstanding', organization?.id],
    queryFn: () => api.getOutstandingAgreements(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useIssueAgreements() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.issueAgreementsToEmployee, onSuccess: () => bust(qc) })
}

export function useSignAgreement() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.signAgreement, onSuccess: () => bust(qc) })
}

export function useMarkAgreementViewed() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.markAgreementViewed, onSuccess: () => bust(qc) })
}

export function useAssignmentRules(templateId: string | undefined) {
  return useQuery({
    queryKey: ['agreements', 'rules', templateId],
    queryFn: () => api.getAssignmentRules(templateId!),
    enabled: !!templateId,
  })
}

export function useAddAssignmentRule() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.addAssignmentRule, onSuccess: () => bust(qc) })
}

export function useDeleteAssignmentRule() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.deleteAssignmentRule, onSuccess: () => bust(qc) })
}
