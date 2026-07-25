import { defaultSchedules, type DayScheduleDraft, type ServiceDraft } from '@/src/data/onboarding';

export interface ManagedServiceDraft extends ServiceDraft {
  readonly id?: string;
  readonly isActive?: boolean;
}

export interface BarberSettingsDraft {
  readonly isBookingPaused: boolean;
  readonly bookingWindowDays: string;
  readonly minimumNoticeMinutes: number;
  readonly intervalMinutes: number;
  readonly schedules: readonly DayScheduleDraft[];
  readonly services: readonly ManagedServiceDraft[];
}

export const bookingWindowOptions = [1, 3, 7, 14, 30] as const;
export const minimumNoticeOptions = [0, 30, 60, 120] as const;

export const emptyBarberSettingsDraft: BarberSettingsDraft = {
  isBookingPaused: false,
  bookingWindowDays: '7',
  minimumNoticeMinutes: 0,
  intervalMinutes: 30,
  schedules: defaultSchedules,
  services: [{ name: '', priceDzd: '', durationMinutes: '30' }],
};

export function normalizeTime(value: string): string {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return value.trim();
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

export function isValidTime(value: string): boolean {
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return Boolean(match);
}

export function validateBarberSettings(draft: BarberSettingsDraft): string | null {
  const windowDays = Number(draft.bookingWindowDays);
  if (!Number.isInteger(windowDays) || windowDays < 0 || windowDays > 365) return 'validation';

  const activeServices = draft.services.filter((service) => service.isActive !== false);
  if (!activeServices.length || activeServices.some((service) => !service.name.trim() || !Number(service.priceDzd) || !Number(service.durationMinutes))) {
    return 'validation';
  }

  const enabledSchedules = draft.schedules.filter((schedule) => schedule.enabled);
  if (!enabledSchedules.length) return 'invalidTime';

  for (const schedule of enabledSchedules) {
    const startsAt = normalizeTime(schedule.startsAt);
    const endsAt = normalizeTime(schedule.endsAt);
    if (!isValidTime(startsAt) || !isValidTime(endsAt) || startsAt >= endsAt) return 'invalidTime';
    for (const item of schedule.breaks) {
      const breakStart = normalizeTime(item.startsAt);
      const breakEnd = normalizeTime(item.endsAt);
      if (!isValidTime(breakStart) || !isValidTime(breakEnd) || breakStart >= breakEnd) return 'invalidTime';
    }
  }

  return null;
}

export function mapSchedulesFromRows(
  rows: readonly {
    readonly day_of_week: number;
    readonly starts_at: string;
    readonly ends_at: string;
    readonly interval_minutes: number;
    readonly schedule_breaks?: readonly { readonly starts_at: string; readonly ends_at: string }[] | null;
  }[],
): { readonly schedules: readonly DayScheduleDraft[]; readonly intervalMinutes: number } {
  const byDay = new Map(rows.map((row) => [row.day_of_week, row]));
  const intervalMinutes = rows[0]?.interval_minutes ?? 30;
  const schedules = defaultSchedules.map((day) => {
    const row = byDay.get(day.dayOfWeek);
    if (!row) return { ...day, enabled: false, breaks: [] };
    return {
      dayOfWeek: day.dayOfWeek,
      enabled: true,
      startsAt: normalizeTime(row.starts_at),
      endsAt: normalizeTime(row.ends_at),
      breaks: (row.schedule_breaks ?? []).map((item) => ({
        startsAt: normalizeTime(item.starts_at),
        endsAt: normalizeTime(item.ends_at),
      })),
    };
  });
  return { schedules, intervalMinutes };
}
