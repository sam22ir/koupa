import type { Appointment } from '@/src/booking';
import { splitAppointments } from '@/src/customerAppointments';

function appointment(overrides: Partial<Appointment>): Appointment {
  return {
    id: overrides.id ?? 'appointment-1',
    barber_id: 'barber-1',
    service_id: 'service-1',
    starts_at: overrides.starts_at ?? '2026-08-01T10:00:00.000Z',
    ends_at: '2026-08-01T10:30:00.000Z',
    price_dzd: 800,
    status: overrides.status ?? 'completed',
    service_name: overrides.service_name ?? 'حلاقة شعر',
    barber_name: overrides.barber_name ?? 'أحمد',
  };
}

describe('splitAppointments', () => {
  it('groups statuses and sorts upcoming ascending and past descending', () => {
    const result = splitAppointments([
      appointment({ id: 'late', status: 'booked', starts_at: '2026-08-04T10:00:00.000Z' }),
      appointment({ id: 'early', status: 'present', starts_at: '2026-08-02T10:00:00.000Z' }),
      appointment({ id: 'cancelled', status: 'cancelled', starts_at: '2026-08-01T10:00:00.000Z' }),
      appointment({ id: 'completed', status: 'completed', starts_at: '2026-08-03T10:00:00.000Z' }),
      appointment({ id: 'absent', status: 'absent', starts_at: '2026-07-30T10:00:00.000Z' }),
    ]);

    expect(result.upcoming.map((item) => item.id)).toEqual(['early', 'late']);
    expect(result.past.map((item) => item.id)).toEqual(['completed', 'cancelled', 'absent']);
  });

  it('does not mutate the input while sorting', () => {
    const items = [appointment({ id: 'first', starts_at: '2026-08-02T10:00:00.000Z' }), appointment({ id: 'second', starts_at: '2026-08-01T10:00:00.000Z' })];
    const original = [...items];
    const result = splitAppointments(items);

    expect(items).toEqual(original);
    expect(result.upcoming).toHaveLength(0);
    expect(result.past.map((item) => item.id)).toEqual(['first', 'second']);
  });
});
