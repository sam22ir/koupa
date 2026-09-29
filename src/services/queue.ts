import { supabase } from '@/lib/supabase';
import {
  parseBarberQueue,
  parseMyQueueEntry,
  type BarberQueue,
  type MyQueueEntry,
  type PublicQueueStatus,
  type QueueAction,
} from '@/src/queue';
import { toAppError } from '@/src/services/errors';

async function rpc<T>(action: () => PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await action();
  if (error) throw toAppError(error);
  return data;
}

export async function getBarberQueue(): Promise<BarberQueue> {
  return parseBarberQueue(await rpc(() => supabase.rpc('get_barber_queue')));
}

export async function setQueueOpen(open: boolean): Promise<void> {
  await rpc(() => supabase.rpc('set_queue_open', { open_value: open }));
}

export async function addWalkin(guestName: string, serviceId: string): Promise<string> {
  const id = await rpc(() => supabase.rpc('add_walkin', { guest_name_value: guestName.trim(), service_id_value: serviceId }));
  if (!id) throw toAppError(new Error('Queue entry was not created'));
  return id;
}

export async function updateQueueEntry(entryId: string, action: QueueAction): Promise<void> {
  await rpc(() => supabase.rpc('update_queue_entry', { entry_id_value: entryId, action_value: action }));
}

export async function joinQueue(barberId: string, serviceId: string): Promise<string> {
  const id = await rpc(() => supabase.rpc('join_queue', { barber_id_value: barberId, service_id_value: serviceId }));
  if (!id) throw toAppError(new Error('Queue entry was not created'));
  return id;
}

export async function leaveQueue(entryId: string): Promise<void> {
  await rpc(() => supabase.rpc('leave_queue', { entry_id_value: entryId }));
}

export async function getMyQueueEntry(): Promise<MyQueueEntry | null> {
  return parseMyQueueEntry(await rpc(() => supabase.rpc('get_my_queue_entry')));
}

export async function getPublicQueueStatus(barberId: string): Promise<PublicQueueStatus | null> {
  const rows = await rpc(() => supabase.rpc('get_public_queue_status', { barber_id_value: barberId }));
  const row = rows?.[0];
  return row ? { queue_open: row.queue_open === true, waiting_count: Number(row.waiting_count ?? 0) } : null;
}
