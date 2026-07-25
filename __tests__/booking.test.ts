import {
  algeriaDate,
  appointmentStatusLabel,
  bookingDates,
  canCancelCustomerAppointment,
  canRescheduleCustomerAppointment,
  formatBookingTime,
} from '@/src/booking';

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

  it('enforces the two-hour customer cancellation cutoff', () => {
    const now = Date.parse('2026-07-23T08:00:00.000Z');
    expect(canCancelCustomerAppointment('2026-07-23T10:00:00.000Z', now)).toBe(true);
    expect(canCancelCustomerAppointment('2026-07-23T09:59:59.000Z', now)).toBe(false);
  });

  it('only allows rescheduling booked appointments', () => {
    expect(canRescheduleCustomerAppointment('booked')).toBe(true);
    expect(canRescheduleCustomerAppointment('present')).toBe(false);
    expect(canRescheduleCustomerAppointment('cancelled')).toBe(false);
  });

  it('returns Arabic appointment status labels', () => {
    expect(appointmentStatusLabel('booked')).toBe('محجوز');
    expect(appointmentStatusLabel('completed')).toBe('مكتمل');
    expect(appointmentStatusLabel('absent')).toBe('غائب');
  });
});
