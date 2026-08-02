import { supabase } from '@/lib/supabase';
import type { AppNotification } from '@/src/notifications';
import { toAppError } from '@/src/services/errors';

export async function loadNotifications(limit = 50): Promise<readonly AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id,title,body,appointment_id,read_at,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw toAppError(error);
  return (data ?? []) as AppNotification[];
}

export async function markNotificationsRead(ids?: readonly string[]): Promise<void> {
  const { error } = await supabase.rpc('mark_notifications_read', {
    notification_ids: ids?.length ? [...ids] : undefined,
  });
  if (error) throw toAppError(error);
}
