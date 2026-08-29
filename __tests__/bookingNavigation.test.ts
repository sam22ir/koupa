import { bookingReturnHref, publicProfileReturnHref } from '@/src/navigation/bookingNavigation';

describe('booking navigation', () => {
  it('accepts only declared origins for an appointment booking flow', () => {
    expect(bookingReturnHref({ barberId: 'barber-1', returnTo: '/barber/barber-1' }))
      .toBe('/barber/barber-1');
    expect(bookingReturnHref({ barberId: 'barber-1', returnTo: '/shop/shop-1' }))
      .toBe('/shop/shop-1');
    expect(bookingReturnHref({
      barberId: 'barber-1',
      appointmentId: 'appointment-1',
      returnTo: '/appointment/appointment-1',
    })).toBe('/appointment/appointment-1');
  });

  it('rejects unsafe or mismatched return targets', () => {
    expect(bookingReturnHref({ barberId: 'barber-1', returnTo: 'https://example.com' }))
      .toBe('/barber/barber-1');
    expect(bookingReturnHref({
      barberId: 'barber-1',
      appointmentId: 'appointment-1',
      returnTo: '/appointment/other-appointment',
    })).toBe('/barber/barber-1');
  });

  it('keeps public profile fallback inside the viewer workspace', () => {
    expect(publicProfileReturnHref('/home', 'customer')).toBe('/home');
    expect(publicProfileReturnHref(undefined, 'barber')).toBe('/(barber)/today');
    expect(publicProfileReturnHref()).toBe('/(auth)/welcome');
  });
});
