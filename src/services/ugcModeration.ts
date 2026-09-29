import { supabase } from '@/lib/supabase';

export type UGCReportTarget = 'profile' | 'shop' | 'ratings';
export type UGCReportReason = 'spam' | 'harassment' | 'misleading' | 'inappropriate' | 'privacy' | 'other';

async function currentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user.id ?? null;
}

export async function isUserBlocked(targetUserId: string): Promise<boolean> {
  const blockerId = await currentUserId();
  if (!blockerId) return false;
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_user_id')
    .eq('blocker_id', blockerId)
    .eq('blocked_user_id', targetUserId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function loadBlockedUserIds(): Promise<readonly string[]> {
  const blockerId = await currentUserId();
  if (!blockerId) return [];
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_user_id')
    .eq('blocker_id', blockerId);
  if (error) throw error;
  return (data ?? []).map((row) => row.blocked_user_id);
}

export async function loadBlockedUsers(): Promise<readonly { readonly id: string; readonly name: string }[]> {
  const ids = await loadBlockedUserIds();
  if (!ids.length) return [];
  const { data, error } = await supabase.from('profiles').select('id,name').in('id', [...ids]);
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, name: row.name }));
}

export async function blockUser(targetUserId: string): Promise<void> {
  const blockerId = await currentUserId();
  if (!blockerId) throw new Error('Sign in is required to block an account');
  if (blockerId === targetUserId) throw new Error('You cannot block your own account');
  const { error } = await supabase.from('user_blocks').insert({
    blocker_id: blockerId,
    blocked_user_id: targetUserId,
  });
  if (error && error.code !== '23505') throw error;
}

export async function unblockUser(targetUserId: string): Promise<void> {
  const blockerId = await currentUserId();
  if (!blockerId) throw new Error('Sign in is required to unblock an account');
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_user_id', targetUserId);
  if (error) throw error;
}

export async function submitUGCReport(input: {
  readonly targetKind: UGCReportTarget;
  readonly targetId: string;
  readonly reason: UGCReportReason;
  readonly details?: string;
}): Promise<void> {
  const reporterId = await currentUserId();
  if (!reporterId) throw new Error('Sign in is required to report content');
  const details = input.details?.trim() ?? '';
  const { error } = await supabase.from('ugc_reports').insert({
    reporter_id: reporterId,
    target_kind: input.targetKind,
    target_id: input.targetId,
    reason: input.reason,
    details: details || null,
  });
  if (error) throw error;
}

export async function excludeBlocked<T extends { readonly id: string }>(items: readonly T[]): Promise<readonly T[]> {
  if (!items.length) return items;
  const blocked = new Set(await loadBlockedUserIds());
  return items.filter((item) => !blocked.has(item.id));
}
