import {
  normalizeTime,
  type BarberSettingsDraft,
  type ManagedServiceDraft,
} from '@/src/barberSettings';
import { defaultSchedules, type DayScheduleDraft } from '@/src/data/onboarding';
import type { BarberScheduleWorkspaceDraft } from '@/src/features/barber-schedule/model';

export const SEARCH_PAGE_SIZE = 20;

export interface SettingsRpcPayload {
  readonly is_booking_paused: boolean;
  readonly booking_window_days: number;
  readonly minimum_notice_minutes: number;
  readonly interval_minutes: number;
  readonly services: readonly {
    readonly id: string | null;
    readonly name: string;
    readonly price_dzd: number;
    readonly duration_minutes: number;
    readonly is_active: boolean;
  }[];
  readonly schedules: readonly {
    readonly day_of_week: number;
    readonly enabled: boolean;
    readonly starts_at: string;
    readonly ends_at: string;
    readonly breaks: readonly { readonly starts_at: string; readonly ends_at: string }[];
  }[];
}

export interface WorkspaceRpcPayload extends SettingsRpcPayload {
  readonly exceptions: readonly {
    readonly exception_date: string;
    readonly is_closed: boolean;
    readonly starts_at: string | null;
    readonly ends_at: string | null;
    readonly note: string | null;
  }[];
}

export function mapSchedulesFromSettingsRows(
  rows: readonly {
    readonly day_of_week: number;
    readonly starts_at: string;
    readonly ends_at: string;
    readonly breaks?: readonly { readonly starts_at: string; readonly ends_at: string }[] | null;
    readonly enabled?: boolean;
  }[],
  intervalMinutes = 30,
): { readonly schedules: readonly DayScheduleDraft[]; readonly intervalMinutes: number } {
  const byDay = new Map(rows.map((row) => [Number(row.day_of_week), row]));
  const schedules = defaultSchedules.map((day) => {
    const row = byDay.get(day.dayOfWeek);
    if (!row) return { ...day, enabled: false, breaks: [] };
    return {
      dayOfWeek: day.dayOfWeek,
      enabled: row.enabled !== false,
      startsAt: normalizeTime(String(row.starts_at).slice(0, 5)),
      endsAt: normalizeTime(String(row.ends_at).slice(0, 5)),
      breaks: (row.breaks ?? []).map((item) => ({
        startsAt: normalizeTime(String(item.starts_at).slice(0, 5)),
        endsAt: normalizeTime(String(item.ends_at).slice(0, 5)),
      })),
    };
  });
  return { schedules, intervalMinutes };
}

export function mapManagedServices(
  rows: readonly {
    readonly id?: string;
    readonly name: string;
    readonly price_dzd: number | string;
    readonly duration_minutes: number | string;
    readonly is_active?: boolean;
  }[],
): readonly ManagedServiceDraft[] {
  return rows
    .filter((service) => service.is_active !== false)
    .map((service) => ({
      id: service.id,
      name: service.name,
      priceDzd: String(service.price_dzd),
      durationMinutes: String(service.duration_minutes),
      isActive: true,
    }));
}

export function mapWorkspaceServices(
  rows: readonly {
    readonly id?: string;
    readonly name: string;
    readonly price_dzd: number | string;
    readonly duration_minutes: number | string;
    readonly is_active?: boolean;
  }[],
): readonly ManagedServiceDraft[] {
  return rows.map((service) => ({
    id: service.id,
    name: service.name,
    priceDzd: String(service.price_dzd),
    durationMinutes: String(service.duration_minutes),
    isActive: service.is_active !== false,
  }));
}

export function toSettingsRpcPayload(settings: BarberSettingsDraft): SettingsRpcPayload {
  return {
    is_booking_paused: settings.isBookingPaused,
    booking_window_days: Number(settings.bookingWindowDays),
    minimum_notice_minutes: settings.minimumNoticeMinutes,
    interval_minutes: settings.intervalMinutes,
    services: settings.services.map((service) => ({
        id: service.id ?? null,
        name: service.name.trim(),
        price_dzd: Number(service.priceDzd),
        duration_minutes: Number(service.durationMinutes),
        is_active: service.isActive !== false,
      })),
    schedules: settings.schedules.map((schedule) => ({
      day_of_week: schedule.dayOfWeek,
      enabled: schedule.enabled,
      starts_at: normalizeTime(schedule.startsAt),
      ends_at: normalizeTime(schedule.endsAt),
      breaks: schedule.breaks.map((item) => ({
        starts_at: normalizeTime(item.startsAt),
        ends_at: normalizeTime(item.endsAt),
      })),
    })),
  };
}

export function toWorkspaceRpcPayload(
  workspace: BarberScheduleWorkspaceDraft,
): WorkspaceRpcPayload {
  return {
    ...toSettingsRpcPayload(workspace.settings),
    exceptions: workspace.exceptions.map((item) => ({
      exception_date: item.exceptionDate,
      is_closed: item.isClosed,
      starts_at: item.isClosed ? null : normalizeTime(item.startsAt),
      ends_at: item.isClosed ? null : normalizeTime(item.endsAt),
      note: item.note.trim() || null,
    })),
  };
}

export function mapOwnerSettingsPayload(data: {
  readonly is_booking_paused?: boolean;
  readonly booking_window_days?: number;
  readonly minimum_notice_minutes?: number;
  readonly interval_minutes?: number;
  readonly services?: readonly {
    readonly id?: string;
    readonly name: string;
    readonly price_dzd: number | string;
    readonly duration_minutes: number | string;
    readonly is_active?: boolean;
  }[];
  readonly schedules?: readonly {
    readonly day_of_week: number;
    readonly starts_at: string;
    readonly ends_at: string;
    readonly breaks?: readonly { readonly starts_at: string; readonly ends_at: string }[] | null;
    readonly enabled?: boolean;
  }[];
} | null): BarberSettingsDraft | null {
  if (!data) return null;
  const mapped = mapSchedulesFromSettingsRows(data.schedules ?? [], Number(data.interval_minutes ?? 30));
  const services = mapWorkspaceServices(data.services ?? []);
  return {
    isBookingPaused: Boolean(data.is_booking_paused),
    bookingWindowDays: String(data.booking_window_days ?? 7),
    minimumNoticeMinutes: Number(data.minimum_notice_minutes ?? 0),
    intervalMinutes: mapped.intervalMinutes,
    schedules: mapped.schedules,
    services: services.length
      ? services
      : [{ name: '', priceDzd: '', durationMinutes: '30', isActive: true }],
  };
}

export function mapOwnerWorkspacePayload(data: {
  readonly is_booking_paused?: boolean;
  readonly booking_window_days?: number;
  readonly minimum_notice_minutes?: number;
  readonly interval_minutes?: number;
  readonly services?: readonly {
    readonly id?: string;
    readonly name: string;
    readonly price_dzd: number | string;
    readonly duration_minutes: number | string;
    readonly is_active?: boolean;
  }[];
  readonly schedules?: readonly {
    readonly day_of_week: number;
    readonly starts_at: string;
    readonly ends_at: string;
    readonly breaks?: readonly { readonly starts_at: string; readonly ends_at: string }[] | null;
    readonly enabled?: boolean;
  }[];
  readonly exceptions?: readonly {
    readonly id?: string;
    readonly exception_date: string;
    readonly is_closed: boolean;
    readonly starts_at?: string | null;
    readonly ends_at?: string | null;
    readonly note?: string | null;
  }[];
} | null): BarberScheduleWorkspaceDraft | null {
  const settings = mapOwnerSettingsPayload(data);
  if (!settings) return null;
  return {
    settings,
    exceptions: (data?.exceptions ?? []).map((item) => ({
      id: item.id,
      exceptionDate: String(item.exception_date),
      isClosed: Boolean(item.is_closed),
      startsAt: normalizeTime(String(item.starts_at ?? '09:00').slice(0, 5)),
      endsAt: normalizeTime(String(item.ends_at ?? '17:00').slice(0, 5)),
      note: item.note ?? '',
    })),
  };
}
