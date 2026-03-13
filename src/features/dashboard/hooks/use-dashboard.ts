import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { fetchDashboardStats, fetchRecentActivity } from '../api/dashboard.api'

export function useDashboardStats() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['dashboard-stats', organization?.id],
    queryFn: () => fetchDashboardStats(organization!.id),
    enabled: !!organization?.id,
    refetchInterval: 60000, // refresh every minute
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
