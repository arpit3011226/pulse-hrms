import { supabase } from '@/lib/supabase'
import type { AppNotification } from '@/types/database.types'

// Get notifications for current user
export async function getNotifications(profileId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data as AppNotification[]
}

// Get unread count
export async function getUnreadNotificationCount(profileId: string) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_profile_id', profileId)
    .eq('is_read', false)
  if (error) throw error
  return count ?? 0
}

// Mark single as read
export async function markNotificationAsRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
  if (error) throw error
}

// Mark all as read
export async function markAllNotificationsAsRead(profileId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_profile_id', profileId)
    .eq('is_read', false)
  if (error) throw error
}

// Create a single notification
export async function createNotification(notification: Omit<AppNotification, 'id' | 'created_at' | 'is_read'>) {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .single()
  if (error) throw error
  return data
}

// Create multiple notifications (broadcast)
export async function createBulkNotifications(notifications: Omit<AppNotification, 'id' | 'created_at' | 'is_read'>[]) {
  if (notifications.length === 0) return []
  const { data, error } = await supabase
    .from('notifications')
    .insert(notifications)
    .select()
  if (error) throw error
  return data
}

// Helper: get profile IDs by role(s) in an org
export async function getProfileIdsByRole(orgId: string, roles: string[]): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('organization_id', orgId)
    .in('role', roles)
    .eq('is_active', true)
  if (error) throw error
  return (data ?? []).map(p => p.id)
}
