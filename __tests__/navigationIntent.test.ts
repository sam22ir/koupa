import {
  consumePendingIntent,
  getPendingIntent,
  setPendingIntentFromPath,
} from '@/src/navigation/pendingIntent';

describe('pending navigation intent', () => {
  beforeEach(() => {
    consumePendingIntent('auth');
    consumePendingIntent('customer');
    consumePendingIntent('barber');
    consumePendingIntent('barber-onboarding');
  });

  it('keeps allowed internal booking paths and restores them for customers', () => {
    expect(setPendingIntentFromPath('/book/abc', { barberId: 'abc', serviceId: 'cut' })).toBe('/book/abc?serviceId=cut');
    expect(getPendingIntent()).toBe('/book/abc?serviceId=cut');
    expect(consumePendingIntent('customer')).toBe('/book/abc?serviceId=cut');
    expect(getPendingIntent()).toBeNull();
  });

  it('rejects external or auth paths', () => {
    expect(setPendingIntentFromPath('https://example.com', {})).toBeNull();
    expect(setPendingIntentFromPath('/(auth)/sign-in', {})).toBeNull();
    expect(getPendingIntent()).toBeNull();
  });

  it('does not restore a customer intent into a barber workspace', () => {
    setPendingIntentFromPath('/appointment/abc', {});
    expect(consumePendingIntent('barber')).toBeNull();
    expect(getPendingIntent()).toBe('/appointment/abc');
    expect(consumePendingIntent('customer')).toBe('/appointment/abc');
  });

  it('retains a deep link while the account moves through authentication', () => {
    setPendingIntentFromPath('/book/abc', { serviceId: 'cut' });
    expect(consumePendingIntent('auth')).toBeNull();
    expect(getPendingIntent()).toBe('/book/abc?serviceId=cut');
    expect(consumePendingIntent('customer-setup')).toBeNull();
    expect(getPendingIntent()).toBe('/book/abc?serviceId=cut');
    expect(consumePendingIntent('customer')).toBe('/book/abc?serviceId=cut');
  });

  it('restores canonical customer notification routes after authentication', () => {
    expect(setPendingIntentFromPath('/notification/notice-1', {})).toBe('/notification/notice-1');
    expect(consumePendingIntent('auth')).toBeNull();
    expect(consumePendingIntent('customer')).toBe('/notification/notice-1');
  });

  it('restores canonical barber event and Shop routes only to barbers', () => {
    expect(setPendingIntentFromPath('/barber-appointment/appointment-1', {}))
      .toBe('/barber-appointment/appointment-1');
    expect(consumePendingIntent('customer')).toBeNull();
    expect(consumePendingIntent('barber')).toBe('/barber-appointment/appointment-1');

    expect(setPendingIntentFromPath('/shop-member/member-1', {})).toBe('/shop-member/member-1');
    expect(consumePendingIntent('barber')).toBe('/shop-member/member-1');
  });

  it('does not retain the ambiguous shared Profile pathname', () => {
    expect(setPendingIntentFromPath('/profile', {})).toBeNull();
  });
});
