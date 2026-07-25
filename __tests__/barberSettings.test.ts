import {
  mapSchedulesFromRows,
  normalizeTime,
  validateBarberSettings,
  type BarberSettingsDraft,
} from '@/src/barberSettings';
import { defaultSchedules } from '@/src/data/onboarding';

const validDraft = (): BarberSettingsDraft => ({
  isBookingPaused: false,
  bookingWindowDays: '7',
  minimumNoticeMinutes: 30,
  intervalMinutes: 15,
  schedules: defaultSchedules.map((schedule) =>
    schedule.dayOfWeek === 0
      ? { ...schedule, enabled: true, startsAt: '09:00', endsAt: '17:00', breaks: [{ startsAt: '13:00', endsAt: '14:00' }] }
      : { ...schedule, enabled: false, breaks: [] },
  ),
  services: [{ id: 'svc-1', name: 'حلاقة', priceDzd: '800', durationMinutes: '30', isActive: true }],
});

describe('barber settings helpers', () => {
  it('normalizes postgres time values to HH:mm', () => {
    expect(normalizeTime('09:00:00')).toBe('09:00');
    expect(normalizeTime('9:30')).toBe('09:30');
  });

  it('accepts a valid schedule and service draft', () => {
    expect(validateBarberSettings(validDraft())).toBeNull();
  });

  it('rejects invalid booking windows and empty services', () => {
    expect(validateBarberSettings({ ...validDraft(), bookingWindowDays: '400' })).toBe('validation');
    expect(validateBarberSettings({ ...validDraft(), services: [{ name: '', priceDzd: '', durationMinutes: '30' }] })).toBe('validation');
  });

  it('rejects inverted times and closed weeks', () => {
    const closed = {
      ...validDraft(),
      schedules: defaultSchedules.map((schedule) => ({ ...schedule, enabled: false, breaks: [] })),
    };
    expect(validateBarberSettings(closed)).toBe('invalidTime');

    const inverted = {
      ...validDraft(),
      schedules: defaultSchedules.map((schedule, index) =>
        index === 0 ? { ...schedule, enabled: true, startsAt: '18:00', endsAt: '09:00', breaks: [] } : { ...schedule, enabled: false, breaks: [] },
      ),
    };
    expect(validateBarberSettings(inverted)).toBe('invalidTime');
  });

  it('maps database schedule rows onto a full weekly draft', () => {
    const mapped = mapSchedulesFromRows([
      {
        day_of_week: 1,
        starts_at: '10:00:00',
        ends_at: '16:00:00',
        interval_minutes: 10,
        schedule_breaks: [{ starts_at: '13:00:00', ends_at: '13:30:00' }],
      },
    ]);
    expect(mapped.intervalMinutes).toBe(10);
    expect(mapped.schedules[1]).toMatchObject({
      dayOfWeek: 1,
      enabled: true,
      startsAt: '10:00',
      endsAt: '16:00',
      breaks: [{ startsAt: '13:00', endsAt: '13:30' }],
    });
    expect(mapped.schedules.filter((schedule) => schedule.enabled)).toHaveLength(1);
  });
});
