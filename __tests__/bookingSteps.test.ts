import {
  canAdvanceBookingStep,
  nextBookingStep,
  previousBookingStep,
} from '@/src/features/booking/bookingSteps';

describe('bookingSteps', () => {
  it('advances date to slots to recap', () => {
    expect(nextBookingStep('date')).toBe('slots');
    expect(nextBookingStep('slots')).toBe('recap');
    expect(previousBookingStep('recap')).toBe('slots');
    expect(previousBookingStep('slots')).toBe('date');
  });

  it('requires the current decision before advancing', () => {
    expect(canAdvanceBookingStep('date', { serviceId: 'cut', date: '2026-08-23', slot: '' })).toBe(true);
    expect(canAdvanceBookingStep('date', { serviceId: '', date: '2026-08-23', slot: '' })).toBe(false);
    expect(canAdvanceBookingStep('slots', { serviceId: 'cut', date: '2026-08-23', slot: '' })).toBe(false);
    expect(canAdvanceBookingStep('slots', { serviceId: 'cut', date: '2026-08-23', slot: '2026-08-23T10:00:00Z' })).toBe(true);
  });
});
