import { useCallback, useState } from 'react';
import * as accountService from '@/src/services/account';

export function useAccountLifecycle() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const deleteAccount = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await accountService.deleteOwnAccount();
      return true;
    } catch (caught) {
      // Keep the real error so the banner can say what went wrong.
      setError(caught);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, deleteAccount };
}
