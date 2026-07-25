import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppNotification } from '@/src/notifications';

export function useNotifications() {
  const [items, setItems] = useState<readonly AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: requestError } = await supabase
        .from('notifications')
        .select('id,title,body,appointment_id,read_at,created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (requestError) throw requestError;
      setItems((data ?? []) as AppNotification[]);
    } catch {
      setError('failed');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (ids?: readonly string[]) => {
    const { error: requestError } = await supabase.rpc('mark_notifications_read', {
      notification_ids: ids?.length ? [...ids] : null,
    });
    if (requestError) {
      setError('failed');
      return false;
    }
    await load();
    return true;
  }, [load]);

  return { items, loading, error, load, markRead };
}
