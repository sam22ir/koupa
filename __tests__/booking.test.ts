import { algeriaDate, bookingDates, formatBookingTime } from '@/src/booking';

describe('booking date helpers', () => {
  it('uses the Algeria calendar date rather than the host timezone', () => {
    expect(algeriaDate(new Date('2026-07-23T23:30:00.000Z'))).toBe('2026-07-24');
  });

  it('returns a bounded inclusive booking window', () => {
    expect(bookingDates(0)).toHaveLength(1);
    expect(bookingDates(500)).toHaveLength(31);
    expect(bookingDates(2)).toHaveLength(3);
  });

  it('formats returned slots in Algeria time', () => {
    expect(formatBookingTime('2026-07-23T09:30:00.000Z')).toContain('10');
  });
});
