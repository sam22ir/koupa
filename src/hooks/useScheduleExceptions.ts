import { useCallback, useEffect, useState } from 'react';
import type { ScheduleException } from '@/src/scheduleExceptions';
import * as scheduleExceptionsService from '@/src/services/scheduleExceptions';

export function useScheduleExceptions(userId?: string) {
  const [exceptions, setExceptions] = useState<readonly ScheduleException[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!userId) {
      setExceptions([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setExceptions(await scheduleExceptionsService.loadScheduleExceptions(userId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'failed');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async (value: Omit<ScheduleException, 'id'>) => {
    if (!userId) return false;
    setSaving(true);
    setError('');
    try {
      await scheduleExceptionsService.upsertScheduleException(userId, value);
      await load();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'failed');
      return false;
    } finally {
      setSaving(false);
    }
  }, [load, userId]);

  const remove = useCallback(async (id: string) => {
    setSaving(true);
    setError('');
    try {
      await scheduleExceptionsService.deleteScheduleException(id);
      await load();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'failed');
      return false;
    } finally {
      setSaving(false);
    }
  }, [load]);

  return { exceptions, loading, saving, error, load, save, remove };
}
