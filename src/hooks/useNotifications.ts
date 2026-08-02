import { useCallback, useState } from 'react';
import type { AppNotification } from '@/src/notifications';
import * as notificationsService from '@/src/services/notifications';

export function useNotifications() {
  const [items, setItems] = useState<readonly AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await notificationsService.loadNotifications());
    } catch {
      setError('failed');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (ids?: readonly string[]) => {
    try {
      await notificationsService.markNotificationsRead(ids);
      await load();
      return true;
    } catch {
      setError('failed');
      return false;
    }
  }, [load]);

  return { items, loading, error, load, markRead };
}
