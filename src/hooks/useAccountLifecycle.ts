import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useAccountLifecycle() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const deleteAccount = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { error: requestError } = await supabase.rpc('delete_own_account');
      if (requestError) throw requestError;
      await supabase.auth.signOut();
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
