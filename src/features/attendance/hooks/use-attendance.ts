import { useApprovalScope } from '@/features/settings/hooks/use-delegation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import type { AttendanceRecord, Shift, ShiftRoster, AttendanceRegularizationRequest } from '@/types/database.types'
import {
  getMyAttendance,
  getTeamAttendance,
  getAllAttendance,
  getTodayAttendance,
  clockIn,
  clockOut,
  markAttendance,
  getShifts,
  createShift,
  updateShift,
  deleteShift,
  getShiftRosters,
  assignShiftRoster,
  bulkAssignShiftRoster,
  updateShiftRoster,
  deleteShiftRoster,
  getEmployeeShift,
  getMyRegularizations,
  getTeamRegularizations,
  getAllRegularizations,
  createRegularization,
  approveRegularization,
  rejectRegularization,
  getCurrentEmployee,
  type AttendanceFilters,
} from '../api/attendance.api'

export type { AttendanceFilters }

// ============================================
// Current Employee
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
// Attendance Records
// ============================================

export function useMyAttendance(employeeId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['attendance', 'my', employeeId, startDate, endDate],
    queryFn: () => getMyAttendance(employeeId, startDate, endDate),
    enabled: !!employeeId,
  })
}

export function useTeamAttendance(managerId: string, date?: string) {
  const { organization } = useAuth()
  // F44 — include anyone currently delegating their approvals to this user
  const { approverIds } = useApprovalScope(managerId || undefined)
  return useQuery({
    queryKey: ['attendance', 'team', approverIds, date],
    queryFn: () => getTeamAttendance(approverIds, organization!.id, date),
    enabled: approverIds.length > 0 && !!organization?.id,
  })
}

export function useAllAttendance(filters?: AttendanceFilters) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['attendance', 'all', organization?.id, filters],
    queryFn: () => getAllAttendance(organization!.id, filters),
    enabled: !!organization?.id,
  })
}

export function useTodayAttendance(employeeId: string, today: string) {
  return useQuery({
    queryKey: ['attendance', 'today', employeeId, today],
    queryFn: () => getTodayAttendance(employeeId, today),
    enabled: !!employeeId && !!today,
  })
}

export function useClockIn() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: ({ employeeId, today, shiftId }: { employeeId: string; today: string; shiftId?: string }) =>
      clockIn(employeeId, organization!.id, today, shiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
  })
}

export function useClockOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, workHours }: { id: string; workHours: number }) =>
      clockOut(id, workHours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
  })
}

export function useMarkAttendance() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (record: Partial<AttendanceRecord>) =>
      markAttendance({ ...record, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
  })
}

// ============================================
// Shifts
// ============================================

export function useShifts() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['shifts', organization?.id],
    queryFn: () => getShifts(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateShift() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<Shift>) =>
      createShift({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })
}

export function useUpdateShift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<Shift> & { id: string }) =>
      updateShift(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })
}

export function useDeleteShift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })
}

// ============================================
// Shift Rosters
// ============================================

export function useShiftRosters() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['shift-rosters', organization?.id],
    queryFn: () => getShiftRosters(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useAssignShiftRoster() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<ShiftRoster>) =>
      assignShiftRoster({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-rosters'] })
    },
  })
}

export function useBulkAssignShiftRoster() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: { employee_ids: string[]; shift_id: string; start_date: string; end_date?: string; assigned_by?: string }) =>
      bulkAssignShiftRoster(
        data.employee_ids.map((eid) => ({
          organization_id: organization!.id,
          employee_id: eid,
          shift_id: data.shift_id,
          start_date: data.start_date,
          end_date: data.end_date || null,
          assigned_by: data.assigned_by || null,
        }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-rosters'] })
    },
  })
}

export function useUpdateShiftRoster() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<ShiftRoster> & { id: string }) =>
      updateShiftRoster(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-rosters'] })
    },
  })
}

export function useDeleteShiftRoster() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteShiftRoster,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-rosters'] })
    },
  })
}

export function useEmployeeShift(employeeId: string, date: string) {
  return useQuery({
    queryKey: ['employee-shift', employeeId, date],
    queryFn: () => getEmployeeShift(employeeId, date),
    enabled: !!employeeId && !!date,
  })
}

// ============================================
// Regularization Requests
// ============================================

export function useMyRegularizations(employeeId: string) {
  return useQuery({
    queryKey: ['regularizations', 'my', employeeId],
    queryFn: () => getMyRegularizations(employeeId),
    enabled: !!employeeId,
  })
}

export function useTeamRegularizations(managerId: string) {
  const { organization } = useAuth()
  // F44 — include anyone currently delegating their approvals to this user
  const { approverIds } = useApprovalScope(managerId || undefined)
  return useQuery({
    queryKey: ['regularizations', 'team', approverIds],
    queryFn: () => getTeamRegularizations(approverIds, organization!.id),
    enabled: approverIds.length > 0 && !!organization?.id,
  })
}

export function useAllRegularizations() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['regularizations', 'all', organization?.id],
    queryFn: () => getAllRegularizations(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateRegularization() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<AttendanceRegularizationRequest>) =>
      createRegularization({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regularizations'] })
    },
  })
}

export function useApproveRegularization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reviewerId, remarks }: { id: string; reviewerId: string; remarks?: string }) =>
      approveRegularization(id, reviewerId, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regularizations'] })
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
  })
}

export function useRejectRegularization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reviewerId, remarks }: { id: string; reviewerId: string; remarks: string }) =>
      rejectRegularization(id, reviewerId, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regularizations'] })
    },
  })
}
