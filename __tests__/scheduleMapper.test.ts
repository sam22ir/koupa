import type { BarberSettingsDraft } from '@/src/barberSettings';
import {
  mapOwnerSettingsPayload,
  mapWorkspaceServices,
  toSettingsRpcPayload,
  toWorkspaceRpcPayload,
} from '@/src/services/mappers/schedule';

describe('settings payload mappers', () => {
  const draft: BarberSettingsDraft = {
    isBookingPaused: true,
    bookingWindowDays: '14',
    minimumNoticeMinutes: 30,
    intervalMinutes: 15,
    services: [
      { id: 'svc-1', name: 'قص', priceDzd: '500', durationMinutes: '30', isActive: true },
      { name: 'hidden', priceDzd: '100', durationMinutes: '15', isActive: false },
    ],
    schedules: [
      {
        dayOfWeek: 0,
        enabled: true,
        startsAt: '9:00',
        endsAt: '17:00',
        breaks: [{ startsAt: '12:00', endsAt: '13:00' }],
      },
      {
        dayOfWeek: 1,
        enabled: false,
        startsAt: '09:00',
        endsAt: '18:00',
        breaks: [],
      },
    ],
  };

  it('serializes active and archived services with explicit state and normalizes times', () => {
    expect(toSettingsRpcPayload(draft)).toEqual({
      is_booking_paused: true,
      booking_window_days: 14,
      minimum_notice_minutes: 30,
      interval_minutes: 15,
      services: [
        { id: 'svc-1', name: 'قص', price_dzd: 500, duration_minutes: 30, is_active: true },
        { id: null, name: 'hidden', price_dzd: 100, duration_minutes: 15, is_active: false },
      ],
      schedules: [
        {
          day_of_week: 0,
          enabled: true,
          starts_at: '09:00',
          ends_at: '17:00',
          breaks: [{ starts_at: '12:00', ends_at: '13:00' }],
        },
        {
          day_of_week: 1,
          enabled: false,
          starts_at: '09:00',
          ends_at: '18:00',
          breaks: [],
        },
      ],
    });
  });

  it('maps owner RPC payload back into a settings draft', () => {
    const mapped = mapOwnerSettingsPayload({
      is_booking_paused: false,
      booking_window_days: 7,
      minimum_notice_minutes: 0,
      interval_minutes: 30,
      services: [{ id: 'a', name: 'حلاقة', price_dzd: 400, duration_minutes: 45, is_active: true }],
      schedules: [{ day_of_week: 2, starts_at: '10:00:00', ends_at: '16:00:00', breaks: [] }],
    });

    expect(mapped?.bookingWindowDays).toBe('7');
    expect(mapped?.services).toHaveLength(1);
    expect(mapped?.schedules.find((day) => day.dayOfWeek === 2)).toMatchObject({
      enabled: true,
      startsAt: '10:00',
      endsAt: '16:00',
    });
  });

  it('keeps active and archived services in the barber workspace', () => {
    expect(
      mapWorkspaceServices([
        { id: 'active', name: 'حلاقة', price_dzd: 500, duration_minutes: 30, is_active: true },
        { id: 'archived', name: 'لحية', price_dzd: 300, duration_minutes: 15, is_active: false },
      ]),
    ).toEqual([
      expect.objectContaining({ id: 'active', isActive: true }),
      expect.objectContaining({ id: 'archived', isActive: false }),
    ]);
  });

  it('serializes the unified workspace with desired exceptions', () => {
    expect(
      toWorkspaceRpcPayload({
        settings: draft,
        exceptions: [
          {
            id: 'exception-1',
            exceptionDate: '2026-08-01',
            isClosed: true,
            startsAt: '09:00',
            endsAt: '17:00',
            note: 'عطلة',
          },
          {
            exceptionDate: '2026-08-02',
            isClosed: false,
            startsAt: '10:00',
            endsAt: '14:00',
            note: '',
          },
        ],
      }),
    ).toMatchObject({
      services: [
        { id: 'svc-1', is_active: true },
        { id: null, is_active: false },
      ],
      exceptions: [
        {
          exception_date: '2026-08-01',
          is_closed: true,
          starts_at: null,
          ends_at: null,
          note: 'عطلة',
        },
        {
          exception_date: '2026-08-02',
          is_closed: false,
          starts_at: '10:00',
          ends_at: '14:00',
          note: null,
        },
      ],
    });
  });
});
