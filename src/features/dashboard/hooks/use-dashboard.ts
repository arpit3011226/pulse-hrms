import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  fetchDashboardStats,
  fetchRecentActivity,
  fetchUpcomingBirthdays,
  fetchUpcomingAnniversaries,
  fetchTeamOnLeave,
  fetchOrgOnLeave,
  fetchMyAttendanceSummary,
  fetchPendingApprovalCounts,
  fetchAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getCurrentEmployee,
} from '../api/dashboard.api'

export function useDashboardStats() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['dashboard-stats', organization?.id],
    queryFn: () => fetchDashboardStats(organization!.id),
    enabled: !!organization?.id,
    refetchInterval: 60000,
  })
}

export function useRecentActivity() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['recent-activity', organization?.id],
    queryFn: () => fetchRecentActivity(organization!.id),
    enabled: !!organization?.id,
    refetchInterval: 60000,
  })
}

export function useDashboardEmployee() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['dashboard-employee', profile?.id],
    queryFn: () => getCurrentEmployee(profile!.id),
    enabled: !!profile?.id,
  })
}

export function useUpcomingBirthdays() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['upcoming-birthdays', organization?.id],
    queryFn: () => fetchUpcomingBirthdays(organization!.id),
    enabled: !!organization?.id,
    refetchInterval: 300000, // 5 minutes
  })
}

export function useUpcomingAnniversaries() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['upcoming-anniversaries', organization?.id],
    queryFn: () => fetchUpcomingAnniversaries(organization!.id),
    enabled: !!organization?.id,
    refetchInterval: 300000,
  })
}

export function useTeamOnLeave(managerId: string | undefined) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['team-on-leave', organization?.id, managerId],
    queryFn: () => fetchTeamOnLeave(managerId!, organization!.id),
    enabled: !!organization?.id && !!managerId,
    refetchInterval: 120000, // 2 minutes
  })
}

export function useOrgOnLeave() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['org-on-leave', organization?.id],
    queryFn: () => fetchOrgOnLeave(organization!.id),
    enabled: !!organization?.id,
    refetchInterval: 120000,
  })
}

export function useMyAttendanceSummary(employeeId: string | undefined) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['my-attendance-summary', organization?.id, employeeId],
    queryFn: () => fetchMyAttendanceSummary(employeeId!, organization!.id),
    enabled: !!organization?.id && !!employeeId,
    refetchInterval: 60000,
  })
}

export function usePendingApprovalCounts(employeeId: string | undefined, role: string | undefined) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['pending-approval-counts', organization?.id, employeeId, role],
    queryFn: () => fetchPendingApprovalCounts(employeeId!, organization!.id, role!),
    enabled: !!organization?.id && !!employeeId && !!role,
    refetchInterval: 60000,
  })
}

export function useAnnouncements() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['announcements', organization?.id],
    queryFn: () => fetchAnnouncements(organization!.id),
    enabled: !!organization?.id,
    refetchInterval: 300000,
  })
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', organization?.id] })
    },
  })
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', organization?.id] })
    },
  })
}
