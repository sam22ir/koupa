import {
  appointmentOverflowActions,
  appointmentPrimaryKind,
} from '@/src/features/customer-home/appointmentFirstView';

describe('appointmentFirstView', () => {
  const now = new Date('2026-08-23T10:00:00.000Z').getTime();

  it('uses scan as the first-view primary only when check-in is open', () => {
    expect(appointmentPrimaryKind({
      status: 'booked',
      starts_at: '2026-08-23T10:15:00.000Z',
      ends_at: '2026-08-23T10:45:00.000Z',
    }, now)).toBe('scan');

    expect(appointmentPrimaryKind({
      status: 'booked',
      starts_at: '2026-08-23T09:30:00.000Z',
      ends_at: '2026-08-23T10:00:00.000Z',
    }, now)).toBe('scan');

    expect(appointmentPrimaryKind({
      status: 'booked',
      starts_at: '2026-08-23T10:31:00.000Z',
      ends_at: '2026-08-23T11:01:00.000Z',
    }, now)).toBe('details');

    expect(appointmentPrimaryKind({
      status: 'booked',
      starts_at: '2026-08-23T09:00:00.000Z',
      ends_at: '2026-08-23T09:30:00.000Z',
    }, now)).toBe('details');

    expect(appointmentPrimaryKind({
      status: 'present',
      starts_at: '2026-08-23T10:15:00.000Z',
      ends_at: '2026-08-23T10:45:00.000Z',
    }, now)).toBe('details');
  });

  it('keeps cancel, reschedule, and directions out of the first-view primary', () => {
    expect(appointmentOverflowActions({
      status: 'booked',
      starts_at: '2026-08-23T14:00:00.000Z',
      location_maps_url: 'https://maps.example/shop',
    }, now)).toEqual(['directions', 'reschedule', 'cancel']);

    expect(appointmentOverflowActions({
      status: 'present',
      starts_at: '2026-08-23T09:30:00.000Z',
      location_maps_url: 'https://maps.example/shop',
    }, now)).toEqual(['directions']);
  });
});
