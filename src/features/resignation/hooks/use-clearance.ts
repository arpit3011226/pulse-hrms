import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  getClearances,
  getAllPendingClearances,
  updateClearance,
} from '../api/clearance.api'
import type { ExitClearance } from '@/types/database.types'

// ============================================================================
// CLEARANCES FOR A SPECIFIC EXIT RECORD
// ============================================================================

export function useClearances(exitRecordId: string) {
  return useQuery({
    queryKey: ['clearances', exitRecordId],
    queryFn: () => getClearances(exitRecordId),
    enabled: !!exitRecordId,
  })
}

// ============================================================================
// ALL PENDING CLEARANCES (org-wide)
// ============================================================================

export function useAllPendingClearances() {
  const { organization } = useAuth()

  return useQuery({
    queryKey: ['pending-clearances', organization?.id],
    queryFn: () => getAllPendingClearances(organization!.id),
    enabled: !!organization?.id,
  })
}

// ============================================================================
// UPDATE CLEARANCE
// ============================================================================

export function useUpdateClearance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      clearanceId,
      status,
      notes,
      clearedByEmployeeId,
    }: {
      clearanceId: string
      status: ExitClearance['clearance_status']
      notes: string | null
      clearedByEmployeeId: string
    }) => updateClearance(clearanceId, status, notes, clearedByEmployeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clearances'] })
      queryClient.invalidateQueries({ queryKey: ['pending-clearances'] })
      queryClient.invalidateQueries({ queryKey: ['resignation-requests'] })
    },
  })
}
