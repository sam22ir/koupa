import { supabase } from '@/lib/supabase';
import { toAppError } from '@/src/services/errors';

export async function deleteOwnAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw toAppError(error);
}
