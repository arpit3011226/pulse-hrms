import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import type {
  LeaveType,
  LeavePolicy,
  LeavePolicyDetail,
  LeaveRequest,
  LeaveRequestDay,
  LeaveBalance,
  Holiday,
  LeaveEncashmentRequest,
  LeaveBlackoutPeriod,
} from '@/types/database.types'
import {
  getLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  getLeavePolicies,
  createLeavePolicy,
  updateLeavePolicy,
  deleteLeavePolicy,
  createLeavePolicyDetails,
  deleteLeavePolicyDetails,
  getEmployeeLeavePolicyMap,
  assignLeavePolicy,
  bulkAssignLeavePolicy,
  getMyLeaveRequests,
  getTeamLeaveRequests,
  getAllLeaveRequests,
  createLeaveRequest,
  createLeaveRequestDays,
  updateLeaveRequestStatus,
  cancelLeaveRequest,
  getOverlappingLeaves,
  getMyLeaveBalances,
  getAllLeaveBalances,
  upsertLeaveBalance,
  adjustLeaveBalance,
  initializeYearBalances,
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getHolidayDates,
  getEncashmentRequests,
  createEncashmentRequest,
  updateEncashmentStatus,
  getBlackoutPeriods,
  createBlackoutPeriod,
  updateBlackoutPeriod,
  deleteBlackoutPeriod,
  processCarryForward,
  getCarryForwardLogs,
  getCurrentEmployee,
  type LeaveRequestFilters,
} from '../api/leave.api'

export type { LeaveRequestFilters }

// ============================================
// Current Employee Hook
// ============================================

export function useCurrentEmployee() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['current-employee', profile?.id],
    queryFn: () => getCurrentEmployee(profile!.id),
    enabled: !!profile?.id,
  })
}

// ============================================
// Leave Types
// ============================================

export function useLeaveTypes() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['leave-types', organization?.id],
    queryFn: () => getLeaveTypes(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateLeaveType() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<LeaveType>) =>
      createLeaveType({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] })
    },
  })
}

export function useUpdateLeaveType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<LeaveType> & { id: string }) =>
      updateLeaveType(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] })
    },
  })
}

export function useDeleteLeaveType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteLeaveType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] })
    },
  })
}

// ============================================
// Leave Policies
// ============================================

export function useLeavePolicies() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['leave-policies', organization?.id],
    queryFn: () => getLeavePolicies(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateLeavePolicy() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: async ({
      policy,
      details,
    }: {
      policy: Partial<LeavePolicy>
      details: Partial<LeavePolicyDetail>[]
    }) => {
      const created = await createLeavePolicy({
        ...policy,
        organization_id: organization!.id,
      })
      if (details.length > 0) {
        await createLeavePolicyDetails(
          details.map((d) => ({ ...d, leave_policy_id: created.id }))
        )
      }
      return created
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-policies'] })
    },
  })
}

export function useUpdateLeavePolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      policy,
      details,
    }: {
      id: string
      policy: Partial<LeavePolicy>
      details: Partial<LeavePolicyDetail>[]
    }) => {
      const updated = await updateLeavePolicy(id, policy)
      // Replace all details
      await deleteLeavePolicyDetails(id)
      if (details.length > 0) {
        await createLeavePolicyDetails(
          details.map((d) => ({ ...d, leave_policy_id: id }))
        )
      }
      return updated
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-policies'] })
    },
  })
}

export function useDeleteLeavePolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteLeavePolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-policies'] })
    },
  })
}

// ============================================
// Employee Leave Policy Map
// ============================================

export function useEmployeeLeavePolicyMap() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['leave-policy-map', organization?.id],
    queryFn: () => getEmployeeLeavePolicyMap(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useAssignLeavePolicy() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: { employee_id: string; leave_policy_id: string; effective_from: string; assigned_by?: string }) =>
      assignLeavePolicy({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-policy-map'] })
    },
  })
}

export function useBulkAssignLeavePolicy() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: { employee_ids: string[]; leave_policy_id: string; effective_from: string; assigned_by?: string }) =>
      bulkAssignLeavePolicy(
        data.employee_ids.map((eid) => ({
          organization_id: organization!.id,
          employee_id: eid,
          leave_policy_id: data.leave_policy_id,
          effective_from: data.effective_from,
          assigned_by: data.assigned_by,
        }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-policy-map'] })
    },
  })
}

// ============================================
// Leave Requests
// ============================================

export function useMyLeaveRequests(employeeId: string) {
  return useQuery({
    queryKey: ['leave-requests', 'my', employeeId],
    queryFn: () => getMyLeaveRequests(employeeId),
    enabled: !!employeeId,
  })
}

export function useTeamLeaveRequests(managerId: string) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['leave-requests', 'team', managerId],
    queryFn: () => getTeamLeaveRequests(managerId, organization!.id),
    enabled: !!managerId && !!organization?.id,
  })
}

export function useAllLeaveRequests(filters?: LeaveRequestFilters) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['leave-requests', 'all', organization?.id, filters],
    queryFn: () => getAllLeaveRequests(organization!.id, filters),
    enabled: !!organization?.id,
  })
}

export function useApplyLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      request,
      days,
      balanceId,
      currentPendingDays,
    }: {
      request: Partial<LeaveRequest>
      days: Partial<LeaveRequestDay>[]
      balanceId: string
      currentPendingDays: number
    }) => {
      const created = await createLeaveRequest(request)
      if (days.length > 0) {
        await createLeaveRequestDays(
          days.map((d) => ({ ...d, leave_request_id: created.id }))
        )
      }
      // Update pending days in balance
      await adjustLeaveBalance(balanceId, {
        pending_days: currentPendingDays + (request.total_days || 0),
      })
      return created
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] })
    },
  })
}

export function useApproveLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      requestId,
      approvedBy,
      totalDays,
      balanceId,
      currentUsedDays,
      currentPendingDays,
    }: {
      requestId: string
      approvedBy: string
      totalDays: number
      balanceId: string
      currentUsedDays: number
      currentPendingDays: number
    }) => {
      await updateLeaveRequestStatus(requestId, 'approved', approvedBy)
      await adjustLeaveBalance(balanceId, {
        used_days: currentUsedDays + totalDays,
        pending_days: Math.max(0, currentPendingDays - totalDays),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] })
    },
  })
}

export function useRejectLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      requestId,
      rejectionReason,
      totalDays,
      balanceId,
      currentPendingDays,
    }: {
      requestId: string
      rejectionReason: string
      totalDays: number
      balanceId: string
      currentPendingDays: number
    }) => {
      await updateLeaveRequestStatus(requestId, 'rejected', undefined, rejectionReason)
      await adjustLeaveBalance(balanceId, {
        pending_days: Math.max(0, currentPendingDays - totalDays),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] })
    },
  })
}

export function useCancelLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      requestId,
      totalDays,
      balanceId,
      currentPendingDays,
    }: {
      requestId: string
      totalDays: number
      balanceId: string
      currentPendingDays: number
    }) => {
      await cancelLeaveRequest(requestId)
      await adjustLeaveBalance(balanceId, {
        pending_days: Math.max(0, currentPendingDays - totalDays),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] })
    },
  })
}

export function useOverlappingLeaves() {
  return useMutation({
    mutationFn: ({
      employeeId,
      startDate,
      endDate,
      excludeId,
    }: {
      employeeId: string
      startDate: string
      endDate: string
      excludeId?: string
    }) => getOverlappingLeaves(employeeId, startDate, endDate, excludeId),
  })
}

// ============================================
// Leave Balances
// ============================================

export function useMyLeaveBalances(employeeId: string, year: number) {
  return useQuery({
    queryKey: ['leave-balances', 'my', employeeId, year],
    queryFn: () => getMyLeaveBalances(employeeId, year),
    enabled: !!employeeId,
  })
}

export function useAllLeaveBalances(year: number) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['leave-balances', 'all', organization?.id, year],
    queryFn: () => getAllLeaveBalances(organization!.id, year),
    enabled: !!organization?.id,
  })
}

export function useInitializeYearBalances() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (year: number) => initializeYearBalances(organization!.id, year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] })
    },
  })
}

export function useAdjustLeaveBalance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      adjustments,
    }: {
      id: string
      adjustments: Partial<Pick<LeaveBalance, 'total_days' | 'used_days' | 'pending_days' | 'credited' | 'debited' | 'closing_balance'>>
    }) => adjustLeaveBalance(id, adjustments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] })
    },
  })
}

// ============================================
// Holidays
// ============================================

export function useHolidays(year?: number) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['holidays', organization?.id, year],
    queryFn: () => getHolidays(organization!.id, year),
    enabled: !!organization?.id,
  })
}

export function useCreateHoliday() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<Holiday>) =>
      createHoliday({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] })
    },
  })
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<Holiday> & { id: string }) =>
      updateHoliday(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] })
    },
  })
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] })
    },
  })
}

export function useHolidayDates(startDate: string, endDate: string) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['holiday-dates', organization?.id, startDate, endDate],
    queryFn: () => getHolidayDates(organization!.id, startDate, endDate),
    enabled: !!organization?.id && !!startDate && !!endDate,
  })
}

// ============================================
// Encashment
// ============================================

export function useEncashmentRequests() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['leave-encashment', organization?.id],
    queryFn: () => getEncashmentRequests(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateEncashmentRequest() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<LeaveEncashmentRequest>) =>
      createEncashmentRequest({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-encashment'] })
    },
  })
}

export function useUpdateEncashmentStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, approvedBy }: { id: string; status: string; approvedBy?: string }) =>
      updateEncashmentStatus(id, status, approvedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-encashment'] })
    },
  })
}

// ============================================
// Blackout Periods
// ============================================

export function useBlackoutPeriods() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['leave-blackout', organization?.id],
    queryFn: () => getBlackoutPeriods(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateBlackoutPeriod() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<LeaveBlackoutPeriod>) =>
      createBlackoutPeriod({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-blackout'] })
    },
  })
}

export function useUpdateBlackoutPeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<LeaveBlackoutPeriod> & { id: string }) =>
      updateBlackoutPeriod(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-blackout'] })
    },
  })
}

export function useDeleteBlackoutPeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteBlackoutPeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-blackout'] })
    },
  })
}

// ============================================
// Carry Forward
// ============================================

export function useCarryForwardLogs(year?: number) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['carry-forward-logs', organization?.id, year],
    queryFn: () => getCarryForwardLogs(organization!.id, year),
    enabled: !!organization?.id,
  })
}

export function useProcessCarryForward() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: ({ fromYear, toYear }: { fromYear: number; toYear: number }) =>
      processCarryForward(organization!.id, fromYear, toYear),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] })
      queryClient.invalidateQueries({ queryKey: ['carry-forward-logs'] })
    },
  })
}
