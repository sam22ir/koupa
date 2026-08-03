import { getGuardedRoute, routeIsAllowed } from '@/src/navigation/routeGuard';

describe('route guard classification', () => {
  it.each([
    [['(customer)', 'home'], 'customer'],
    [['book', '[barberId]'], 'customer'],
    [['appointment', '[id]'], 'customer'],
    [['scan'], 'customer'],
    [['(barber)', 'today'], 'barber'],
    [['onboarding', 'index'], 'barber-onboarding'],
    [['notifications'], 'authenticated'],
    [['barber', '[id]'], null],
    [['shop', '[id]'], null],
    [['(auth)', 'sign-in'], null],
  ])('classifies %j as %s', (segments, expected) => {
    expect(getGuardedRoute(segments)).toBe(expected);
  });

  it('allows authenticated notification routes for either workspace role', () => {
    expect(routeIsAllowed('authenticated', 'customer')).toBe(true);
    expect(routeIsAllowed('authenticated', 'barber')).toBe(true);
    expect(routeIsAllowed('authenticated', 'auth')).toBe(false);
  });

  it('keeps role-specific routes exclusive', () => {
    expect(routeIsAllowed('customer', 'customer')).toBe(true);
    expect(routeIsAllowed('customer', 'barber')).toBe(false);
    expect(routeIsAllowed('barber', 'barber-onboarding')).toBe(false);
    expect(routeIsAllowed('barber-onboarding', 'barber-onboarding')).toBe(true);
  });
});
