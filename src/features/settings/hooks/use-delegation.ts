import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import * as api from '../api/delegation.api'
import type { ApprovalDelegation } from '../api/delegation.api'

export function useMyDelegations(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['delegations', 'mine', employeeId],
    queryFn: () => api.getMyDelegations(employeeId!),
    enabled: !!employeeId,
  })
}

export function useAllDelegations() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['delegations', 'all', organization?.id],
    queryFn: () => api.getAllDelegations(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateDelegation() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (payload: Partial<ApprovalDelegation>) =>
      api.createDelegation({ ...payload, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegations'] })
      queryClient.invalidateQueries({ queryKey: ['approval-scope'] })
    },
  })
}

export function useRevokeDelegation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.revokeDelegation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegations'] })
      queryClient.invalidateQueries({ queryKey: ['approval-scope'] })
    },
  })
}

export function useDeleteDelegation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteDelegation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegations'] })
      queryClient.invalidateQueries({ queryKey: ['approval-scope'] })
    },
  })
}

/**
 * F44 — the set of manager ids whose approvals the signed-in user may act on:
 * their own id, plus anyone currently delegating to them.
 *
 * Approval queries should filter on this list rather than on a single id, so
 * that cover actually works.
 */
export function useApprovalScope(myEmployeeId: string | undefined) {
  const { data: delegated, isLoading } = useQuery({
    queryKey: ['approval-scope', myEmployeeId],
    queryFn: api.getDelegatedManagerIds,
    enabled: !!myEmployeeId,
    staleTime: 5 * 60 * 1000,
  })

  const ids = myEmployeeId ? [myEmployeeId, ...(delegated ?? [])] : []
  return {
    /** manager ids this user may approve for, own id first */
    approverIds: ids,
    /** ids covered by delegation only */
    delegatedIds: delegated ?? [],
    isCovering: (delegated ?? []).length > 0,
    isLoading,
  }
}
