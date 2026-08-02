import {
  getCustomerInitials,
  getTodayDashboard,
  getTodayDurationMinutes,
} from '../src/barberToday';
import type { TodayAppointment } from '../src/booking';

function appointment(
  id: string,
  startsAt: string,
  status: TodayAppointment['status'],
): TodayAppointment {
  return {
    id,
    starts_at: startsAt,
    ends_at: new Date(new Date(startsAt).getTime() + 30 * 60_000).toISOString(),
    price_dzd: 800,
    status,
    service_name: 'حلاقة شعر',
    customer_name: 'سمير سعدي',
    customer_phone: '0550000000',
  };
}

describe('barber Today dashboard', () => {
  it('keeps all counters at zero for an empty day', () => {
    expect(getTodayDashboard([])).toEqual({
      counts: { upcoming: 0, present: 0, completed: 0 },
      appointments: [],
    });
  });

  it('sorts appointments chronologically and excludes inactive states from counters', () => {
    const result = getTodayDashboard([
      appointment('late', '2026-07-29T11:00:00Z', 'completed'),
      appointment('absent', '2026-07-29T09:00:00Z', 'absent'),
      appointment('early', '2026-07-29T08:00:00Z', 'booked'),
      appointment('present', '2026-07-29T10:00:00Z', 'present'),
      appointment('cancelled', '2026-07-29T12:00:00Z', 'cancelled'),
    ]);

    expect(result.counts).toEqual({ upcoming: 1, present: 1, completed: 1 });
    expect(result.appointments.map(({ id }) => id)).toEqual([
      'early',
      'absent',
      'present',
      'late',
      'cancelled',
    ]);
  });

  it('derives appointment duration and customer initials', () => {
    const item = appointment('one', '2026-07-29T08:00:00Z', 'booked');

    expect(getTodayDurationMinutes(item)).toBe(30);
    expect(getCustomerInitials('سمير سعدي')).toBe('سس');
    expect(getCustomerInitials('  ')).toBe('');
  });
});
