import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/features/resignation/api/notifications.api'

export function useNotifications() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: () => getNotifications(profile!.id),
    enabled: !!profile?.id,
  })
}

export function useUnreadNotificationCount() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['notification-count', profile?.id],
    queryFn: () => getUnreadNotificationCount(profile!.id),
    enabled: !!profile?.id,
    refetchInterval: 60000, // poll every 60s
  })
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}

export function useMarkAllAsRead() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => markAllNotificationsAsRead(profile!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}
