import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import type { UserRole } from '@/src/auth';
import * as pushService from '@/src/services/push';

export function usePushRegistration(userId?: string, role?: UserRole) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState('');

  const register = useCallback(async () => {
    if (!userId) return null;
    try {
      setError('');
      const pushToken = await pushService.registerDevicePushToken(userId);
      setToken(pushToken);
      return pushToken;
    } catch {
      setError('failed');
      return null;
    }
  }, [userId]);

  useEffect(() => {
    // Registration intentionally starts an external async device-token sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void register();
  }, [register]);

  useEffect(() => {
    if (role !== 'customer' && role !== 'barber') return;
    let dispose: (() => void) | null = null;
    void pushService.subscribeToNotificationResponses(role, (href) => router.push(href))
      .then((cleanup) => { dispose = cleanup; });
    return () => dispose?.();
  }, [role]);

  return { token, error, register };
}
