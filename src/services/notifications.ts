import { supabase } from '@/lib/supabase';
import type { AppNotification } from '@/src/notifications';
import { toAppError } from '@/src/services/errors';

type NotificationRow = Omit<AppNotification, 'destination'> & { readonly destination?: unknown };

function isMissingDestinationColumn(error: { readonly code?: string; readonly message?: string } | null): boolean {
  return (
    (error?.code === 'PGRST204' || error?.code === '42703')
    && error.message?.includes('destination') === true
  );
}

function mapNotificationRows(rows: readonly NotificationRow[]): readonly AppNotification[] {
  return rows.map((row) => ({
    ...row,
    destination: row.destination ?? { kind: 'notification' },
  }));
}

export async function loadNotifications(limit = 50): Promise<readonly AppNotification[]> {
  const result = await supabase
    .from('notifications')
    .select('id,title,body,appointment_id,destination,read_at,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (!result.error) return mapNotificationRows((result.data ?? []) as NotificationRow[]);
  if (!isMissingDestinationColumn(result.error)) throw toAppError(result.error);

  // Staging can briefly lag the app's reproducible migration. Keep historical
  // appointment notifications usable until the destination column arrives.
  const legacy = await supabase
    .from('notifications')
    .select('id,title,body,appointment_id,read_at,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (legacy.error) throw toAppError(legacy.error);
  return mapNotificationRows((legacy.data ?? []) as NotificationRow[]);
}

export async function loadNotification(notificationId: string): Promise<AppNotification | null> {
  const result = await supabase
    .from('notifications')
    .select('id,title,body,appointment_id,destination,read_at,created_at')
    .eq('id', notificationId)
    .maybeSingle();
  if (!result.error) {
    return result.data ? mapNotificationRows([result.data as NotificationRow])[0] : null;
  }
  if (!isMissingDestinationColumn(result.error)) throw toAppError(result.error);

  const legacy = await supabase
    .from('notifications')
    .select('id,title,body,appointment_id,read_at,created_at')
    .eq('id', notificationId)
    .maybeSingle();
  if (legacy.error) throw toAppError(legacy.error);
  return legacy.data ? mapNotificationRows([legacy.data as NotificationRow])[0] : null;
}

export async function markNotificationsRead(ids?: readonly string[]): Promise<void> {
  const { error } = await supabase.rpc('mark_notifications_read', {
    notification_ids: ids?.length ? [...ids] : undefined,
  });
  if (error) throw toAppError(error);
}
