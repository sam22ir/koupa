import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  emptyBarberSettingsDraft,
  mapSchedulesFromRows,
  normalizeTime,
  validateBarberSettings,
  type BarberSettingsDraft,
  type ManagedServiceDraft,
} from '@/src/barberSettings';

export interface UseBarberSettingsProps {
  readonly userId?: string;
}

export function useBarberSettings({ userId }: UseBarberSettingsProps) {
  const [draft, setDraft] = useState<BarberSettingsDraft>(emptyBarberSettingsDraft);
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [profileResult, servicesResult, schedulesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('is_booking_paused,booking_window_days,minimum_notice_minutes')
          .eq('id', userId)
          .single(),
        supabase
          .from('services')
          .select('id,name,price_dzd,duration_minutes,is_active')
          .eq('barber_id', userId)
          .order('name'),
        supabase
          .from('weekly_schedules')
          .select('id,day_of_week,starts_at,ends_at,interval_minutes,schedule_breaks(starts_at,ends_at)')
          .eq('barber_id', userId)
          .order('day_of_week'),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (servicesResult.error) throw servicesResult.error;
      if (schedulesResult.error) throw schedulesResult.error;

      const mapped = mapSchedulesFromRows(schedulesResult.data ?? []);
      const services = (servicesResult.data ?? [])
        .filter((service) => service.is_active)
        .map(
          (service): ManagedServiceDraft => ({
            id: service.id,
            name: service.name,
            priceDzd: String(service.price_dzd),
            durationMinutes: String(service.duration_minutes),
            isActive: true,
          }),
        );

      setDraft({
        isBookingPaused: Boolean(profileResult.data.is_booking_paused),
        bookingWindowDays: String(profileResult.data.booking_window_days ?? 7),
        minimumNoticeMinutes: profileResult.data.minimum_notice_minutes ?? 0,
        intervalMinutes: mapped.intervalMinutes,
        schedules: mapped.schedules,
        services: services.length ? services : emptyBarberSettingsDraft.services,
      });
    } catch {
      setError('failed');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    if (!userId) return false;
    const validation = validateBarberSettings(draft);
    if (validation) {
      setError(validation);
      setMessage('');
      return false;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const activeServices = draft.services.filter((service) => service.isActive !== false);
      const { data: existingServices, error: existingServicesError } = await supabase
        .from('services')
        .select('id')
        .eq('barber_id', userId)
        .eq('is_active', true);
      if (existingServicesError) throw existingServicesError;

      const keptIds = new Set(activeServices.map((service) => service.id).filter(Boolean) as string[]);
      const removedIds = (existingServices ?? []).map((service) => service.id).filter((id) => !keptIds.has(id));
      if (removedIds.length) {
        const { error: deactivateError } = await supabase.from('services').update({ is_active: false }).in('id', removedIds);
        if (deactivateError) throw deactivateError;
      }

      for (const service of activeServices) {
        const payload = {
          name: service.name.trim(),
          price_dzd: Number(service.priceDzd),
          duration_minutes: Number(service.durationMinutes),
          is_active: true,
        };
        if (service.id) {
          const { error: updateError } = await supabase.from('services').update(payload).eq('id', service.id).eq('barber_id', userId);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase.from('services').insert({ ...payload, barber_id: userId });
          if (insertError) throw insertError;
        }
      }

      const { data: existingSchedules, error: existingSchedulesError } = await supabase
        .from('weekly_schedules')
        .select('id')
        .eq('barber_id', userId);
      if (existingSchedulesError) throw existingSchedulesError;

      const existingScheduleIds = (existingSchedules ?? []).map((schedule) => schedule.id);
      if (existingScheduleIds.length) {
        const { error: deleteBreaksError } = await supabase.from('schedule_breaks').delete().in('schedule_id', existingScheduleIds);
        if (deleteBreaksError) throw deleteBreaksError;
      }

      const { error: deleteSchedulesError } = await supabase.from('weekly_schedules').delete().eq('barber_id', userId);
      if (deleteSchedulesError) throw deleteSchedulesError;

      const enabledSchedules = draft.schedules.filter((schedule) => schedule.enabled);
      const scheduleRows = enabledSchedules.map((schedule) => ({
        barber_id: userId,
        day_of_week: schedule.dayOfWeek,
        starts_at: normalizeTime(schedule.startsAt),
        ends_at: normalizeTime(schedule.endsAt),
        interval_minutes: draft.intervalMinutes,
      }));
      const { data: insertedSchedules, error: insertSchedulesError } = await supabase
        .from('weekly_schedules')
        .insert(scheduleRows)
        .select('id,day_of_week');
      if (insertSchedulesError) throw insertSchedulesError;

      const breakRows = enabledSchedules.flatMap((schedule) => {
        const scheduleId = insertedSchedules?.find((row) => row.day_of_week === schedule.dayOfWeek)?.id;
        if (!scheduleId) return [];
        return schedule.breaks.map((item) => ({
          schedule_id: scheduleId,
          starts_at: normalizeTime(item.startsAt),
          ends_at: normalizeTime(item.endsAt),
        }));
      });
      if (breakRows.length) {
        const { error: insertBreaksError } = await supabase.from('schedule_breaks').insert(breakRows);
        if (insertBreaksError) throw insertBreaksError;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_booking_paused: draft.isBookingPaused,
          booking_window_days: Number(draft.bookingWindowDays),
          minimum_notice_minutes: draft.minimumNoticeMinutes,
        })
        .eq('id', userId);
      if (profileError) throw profileError;

      await load();
      setMessage('saved');
      return true;
    } catch {
      setError('failed');
      return false;
    } finally {
      setSaving(false);
    }
  }, [draft, load, userId]);

  return { draft, setDraft, loading, saving, error, message, clearMessage: () => setMessage(''), save, reload: load };
}
