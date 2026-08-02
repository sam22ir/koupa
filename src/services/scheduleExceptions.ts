import { supabase } from '@/lib/supabase';
import { emptyScheduleException, type ScheduleException } from '@/src/scheduleExceptions';
import { toAppError } from '@/src/services/errors';

function mapException(row: {
  id: string;
  exception_date: string;
  is_closed: boolean;
  starts_at: string | null;
  ends_at: string | null;
  note: string | null;
}): ScheduleException {
  return {
    id: row.id,
    exceptionDate: row.exception_date,
    isClosed: row.is_closed,
    startsAt: row.starts_at?.slice(0, 5) ?? emptyScheduleException.startsAt,
    endsAt: row.ends_at?.slice(0, 5) ?? emptyScheduleException.endsAt,
    note: row.note ?? '',
  };
}

export async function loadScheduleExceptions(userId: string): Promise<readonly ScheduleException[]> {
  const { data, error } = await supabase
    .from('schedule_exceptions')
    .select('id,exception_date,is_closed,starts_at,ends_at,note')
    .eq('barber_id', userId)
    .order('exception_date');
  if (error) throw toAppError(error);
  return (data ?? []).map(mapException);
}

export async function upsertScheduleException(
  userId: string,
  value: Omit<ScheduleException, 'id'>,
): Promise<void> {
  const { error } = await supabase.from('schedule_exceptions').upsert({
    barber_id: userId,
    exception_date: value.exceptionDate,
    is_closed: value.isClosed,
    starts_at: value.isClosed ? null : value.startsAt,
    ends_at: value.isClosed ? null : value.endsAt,
    note: value.note.trim() || null,
  }, { onConflict: 'barber_id,exception_date' });
  if (error) throw toAppError(error);
}

export async function deleteScheduleException(id: string): Promise<void> {
  const { error } = await supabase.from('schedule_exceptions').delete().eq('id', id);
  if (error) throw toAppError(error);
}
