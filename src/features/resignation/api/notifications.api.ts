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

/**
 * QA-29: notifications were never delivered to anybody but yourself.
 *
 * Both of these used to end in `.select()`, which asks PostgREST to hand the
 * inserted rows back. Reading a notification is governed by:
 *
 *     user_read_own_notifications  USING (recipient_profile_id = auth.uid())
 *
 * You may write a notification for a colleague, but you may not read it. So
 * the insert went in, the RETURNING was refused, and the whole statement was
 * rolled back with a 403. Every caller wraps this in a try/catch that logs
 * and carries on, so nothing surfaced — the resignation was saved, the
 * console said "Failed to send resignation notifications", and the manager
 * was never told.
 *
 * Proven at the database: the same insert succeeds without RETURNING and is
 * refused with it.
 *
 * Nothing used the returned rows, so they are no longer asked for. Writing a
 * notification is fire and forget.
 */

// Create a single notification
export async function createNotification(notification: Omit<AppNotification, 'id' | 'created_at' | 'is_read'>) {
  const { error } = await supabase.from('notifications').insert(notification)
  if (error) throw error
}

// Create multiple notifications (broadcast)
export async function createBulkNotifications(notifications: Omit<AppNotification, 'id' | 'created_at' | 'is_read'>[]) {
  if (notifications.length === 0) return
  const { error } = await supabase.from('notifications').insert(notifications)
  if (error) throw error
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
