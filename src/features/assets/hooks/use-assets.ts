import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import * as api from '../api/assets.api'
import type { Asset } from '../api/assets.api'

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['assets'] })
}

export function useAssets() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['assets', 'list', organization?.id],
    queryFn: () => api.getAssets(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useAssetAssignments() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['assets', 'assignments', organization?.id],
    queryFn: () => api.getAssignments(organization!.id),
    enabled: !!organization?.id,
  })
}

/** What one person is holding right now — used by the 360 hub and exit clearance. */
export function useEmployeeAssets(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['assets', 'employee', employeeId],
    queryFn: () => api.getEmployeeAssets(employeeId!),
    enabled: !!employeeId,
  })
}

export function useCreateAsset() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (payload: Partial<Asset>) =>
      api.createAsset({ ...payload, organization_id: organization!.id }),
    onSuccess: () => invalidate(qc),
  })
}

export function useUpdateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<Asset> & { id: string }) => api.updateAsset(id, updates),
    onSuccess: () => invalidate(qc),
  })
}

export function useDeleteAsset() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.deleteAsset, onSuccess: () => invalidate(qc) })
}

export function useAssignAsset() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (payload: Omit<Parameters<typeof api.assignAsset>[0], 'organization_id'>) =>
      api.assignAsset({ ...payload, organization_id: organization!.id }),
    onSuccess: () => invalidate(qc),
  })
}

export function useReturnAsset() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.returnAsset, onSuccess: () => invalidate(qc) })
}

export function useFlagAssetsForReturn() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.flagAssetsForReturn, onSuccess: () => invalidate(qc) })
}
