import type { Appointment } from '@/src/booking';
import { deriveRecentBarbers } from '@/src/customerHome';

const appointment = (overrides: Partial<Appointment>): Appointment => ({
  id: overrides.id ?? 'appointment-1',
  barber_id: overrides.barber_id ?? 'barber-1',
  service_id: 'service-1',
  starts_at: overrides.starts_at ?? '2026-07-31T10:00:00.000Z',
  ends_at: '2026-07-31T10:30:00.000Z',
  price_dzd: 800,
  status: overrides.status ?? 'completed',
  service_name: 'حلاقة شعر',
  barber_name: 'barber_name' in overrides ? overrides.barber_name : 'أحمد',
});

describe('customer Home helpers', () => {
  it('returns unique completed barbers, newest visit first, limited to three', () => {
    const result = deriveRecentBarbers([
      appointment({ id: 'old-a', barber_id: 'a', barber_name: 'أحمد', starts_at: '2026-07-20T10:00:00.000Z' }),
      appointment({ id: 'new-a', barber_id: 'a', barber_name: 'أحمد', starts_at: '2026-07-30T10:00:00.000Z' }),
      appointment({ id: 'b', barber_id: 'b', barber_name: 'سمير', starts_at: '2026-07-29T10:00:00.000Z' }),
      appointment({ id: 'c', barber_id: 'c', barber_name: 'عمر', starts_at: '2026-07-28T10:00:00.000Z' }),
      appointment({ id: 'd', barber_id: 'd', barber_name: 'ياسين', starts_at: '2026-07-27T10:00:00.000Z' }),
    ]);

    expect(result).toEqual([
      { barberId: 'a', barberName: 'أحمد', lastVisitedAt: '2026-07-30T10:00:00.000Z' },
      { barberId: 'b', barberName: 'سمير', lastVisitedAt: '2026-07-29T10:00:00.000Z' },
      { barberId: 'c', barberName: 'عمر', lastVisitedAt: '2026-07-28T10:00:00.000Z' },
    ]);
  });

  it('ignores non-completed appointments and preserves a usable name fallback', () => {
    expect(deriveRecentBarbers([
      appointment({ status: 'booked', barber_id: 'booked-barber' }),
      appointment({ status: 'cancelled', barber_id: 'cancelled-barber' }),
      appointment({ status: 'completed', barber_id: 'completed-barber', barber_name: undefined }),
    ])).toEqual([
      { barberId: 'completed-barber', barberName: 'حلاق', lastVisitedAt: '2026-07-31T10:00:00.000Z' },
    ]);
  });
});
