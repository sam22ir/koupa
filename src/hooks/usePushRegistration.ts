import { useCallback, useEffect, useState } from 'react';
import * as pushService from '@/src/services/push';

export function usePushRegistration(userId?: string) {
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

  return { token, error, register };
}
