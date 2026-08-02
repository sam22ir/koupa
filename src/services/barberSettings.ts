import { supabase } from '@/lib/supabase';
import {
  emptyBarberSettingsDraft,
  mapSchedulesFromRows,
  type BarberSettingsDraft,
  type ManagedServiceDraft,
} from '@/src/barberSettings';
import type { BarberScheduleWorkspaceDraft } from '@/src/features/barber-schedule/model';
import {
  mapOwnerSettingsPayload,
  mapWorkspaceServices,
  toSettingsRpcPayload,
  toWorkspaceRpcPayload,
} from '@/src/services/mappers/schedule';
import { toAppError } from '@/src/services/errors';
import { loadScheduleExceptions } from '@/src/services/scheduleExceptions';
import type { Json } from '@/src/types/database';

export async function loadBarberSettings(userId: string): Promise<BarberSettingsDraft> {
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

  if (profileResult.error) throw toAppError(profileResult.error);
  if (servicesResult.error) throw toAppError(servicesResult.error);
  if (schedulesResult.error) throw toAppError(schedulesResult.error);

  const mapped = mapSchedulesFromRows(schedulesResult.data ?? []);
  const services: readonly ManagedServiceDraft[] = mapWorkspaceServices(
    servicesResult.data ?? [],
  );

  return {
    isBookingPaused: Boolean(profileResult.data.is_booking_paused),
    bookingWindowDays: String(profileResult.data.booking_window_days ?? 7),
    minimumNoticeMinutes: profileResult.data.minimum_notice_minutes ?? 0,
    intervalMinutes: mapped.intervalMinutes,
    schedules: mapped.schedules,
    services: services.length ? services : emptyBarberSettingsDraft.services,
  };
}

export async function loadBarberScheduleWorkspace(
  userId: string,
): Promise<BarberScheduleWorkspaceDraft> {
  const [settings, exceptions] = await Promise.all([
    loadBarberSettings(userId),
    loadScheduleExceptions(userId),
  ]);
  return { settings, exceptions };
}

export async function saveBarberScheduleWorkspace(
  workspace: BarberScheduleWorkspaceDraft,
): Promise<void> {
  const { error } = await supabase.rpc('replace_barber_workspace_settings', {
    workspace: toWorkspaceRpcPayload(workspace) as unknown as Json,
  });
  if (error) throw toAppError(error);
}

export async function replaceBarberSettings(settings: BarberSettingsDraft): Promise<void> {
  const { error } = await supabase.rpc('replace_barber_settings', {
    settings: toSettingsRpcPayload(settings) as unknown as Json,
  });
  if (error) throw toAppError(error);
}

export async function loadOwnerManagedSettings(barberId: string): Promise<BarberSettingsDraft | null> {
  const { data, error } = await supabase.rpc('shop_owner_barber_settings', { target_barber_id: barberId });
  if (error) throw toAppError(error);
  return mapOwnerSettingsPayload((data ?? null) as never);
}

export async function saveOwnerManagedSettings(barberId: string, settings: BarberSettingsDraft): Promise<void> {
  const { error } = await supabase.rpc('shop_owner_update_barber_settings', {
    target_barber_id: barberId,
    settings: toSettingsRpcPayload(settings) as unknown as Json,
  });
  if (error) throw toAppError(error);
}
