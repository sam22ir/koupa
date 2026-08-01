import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/src/data/onboarding';
import { toAppError } from '@/src/services/errors';

export interface Profile {
  readonly id: string;
  readonly role: UserRole;
  readonly name: string;
  readonly phone: string;
  readonly is_published: boolean;
}

export async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,role,name,phone,is_published')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data as Profile | null;
}

export async function updateProfileName(userId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ name })
    .eq('id', userId);
  if (error) throw toAppError(error);
}
