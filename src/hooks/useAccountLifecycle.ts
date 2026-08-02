import { useCallback, useState } from 'react';
import * as accountService from '@/src/services/account';

export function useAccountLifecycle() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const deleteAccount = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await accountService.deleteOwnAccount();
      return true;
    } catch {
      setError('failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, deleteAccount };
}
