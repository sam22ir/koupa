import { getGuardedRoute, routeIsAllowed } from '@/src/navigation/routeGuard';

describe('route guard classification', () => {
  it.each([
    [['(customer)', 'home'], 'customer-browse'],
    [['(customer)', 'find'], 'customer-browse'],
    [['(customer)', 'appointments'], 'customer'],
    [['(customer)', 'profile'], 'customer'],
    [['book', '[barberId]'], 'customer-browse'],
    [['appointment', '[id]'], 'customer'],
    [['barber', '[id]'], 'public-browse'],
    [['shop', '[id]'], 'public-browse'],
    [['barber-appointment', '[id]'], 'barber'],
    [['scan'], 'customer'],
    [['(barber)', 'today'], 'barber'],
    [['onboarding', 'index'], 'barber-onboarding'],
    [['notifications'], 'authenticated'],
    [['roadmap'], 'authenticated'],
    [['(auth)', 'intro'], 'auth'],
    [['(auth)', 'welcome'], 'auth'],
    [['(auth)', 'confirm'], 'confirmation'],
    [['(auth)', 'finish-account'], 'finish-account'],
    [['(auth)', 'customer-setup'], 'customer-setup'],
    [['(auth)', 'session-error'], 'session-error'],
    [['(auth)', 'reset-password'], 'recovery'],
    [['(auth)', 'sign-in'], 'auth'],
  ])('classifies %j as %s', (segments, expected) => {
    expect(getGuardedRoute(segments)).toBe(expected);
  });

  it('allows authenticated notification routes for either workspace role', () => {
    expect(routeIsAllowed('authenticated', 'customer')).toBe(true);
    expect(routeIsAllowed('authenticated', 'barber')).toBe(true);
    expect(routeIsAllowed('authenticated', 'auth')).toBe(false);
  });

  it('lets guests read discovery tabs and use auth screens but nothing account-bound', () => {
    expect(routeIsAllowed('customer-browse', 'guest')).toBe(true);
    expect(routeIsAllowed('customer-browse', 'customer')).toBe(true);
    expect(routeIsAllowed('customer-browse', 'barber')).toBe(false);
    expect(routeIsAllowed('auth', 'guest')).toBe(true);
    expect(routeIsAllowed('public-browse', 'guest')).toBe(true);
    expect(routeIsAllowed('customer', 'guest')).toBe(false);
    expect(routeIsAllowed('authenticated', 'guest')).toBe(false);
    expect(routeIsAllowed('barber', 'guest')).toBe(false);
  });

  it('keeps public browsing available while restricting customer booking', () => {
    expect(routeIsAllowed('public-browse', 'auth')).toBe(true);
    expect(routeIsAllowed('public-browse', 'customer')).toBe(true);
    expect(routeIsAllowed('public-browse', 'barber')).toBe(true);
    expect(routeIsAllowed('customer', 'barber')).toBe(false);
  });

  it('keeps role-specific routes exclusive', () => {
    expect(routeIsAllowed('customer', 'customer')).toBe(true);
    expect(routeIsAllowed('customer', 'barber')).toBe(false);
    expect(routeIsAllowed('barber', 'barber-onboarding')).toBe(false);
    expect(routeIsAllowed('barber-onboarding', 'barber-onboarding')).toBe(true);
  });

  it('allows only the session destination for auth flow routes', () => {
    expect(routeIsAllowed('auth', 'auth')).toBe(true);
    expect(routeIsAllowed('auth', 'customer')).toBe(false);
    expect(routeIsAllowed('confirmation', 'confirm')).toBe(true);
    expect(routeIsAllowed('finish-account', 'finish-account')).toBe(true);
    expect(routeIsAllowed('recovery', 'customer')).toBe(true);
    expect(routeIsAllowed('recovery', 'finish-account')).toBe(true);
    expect(routeIsAllowed('recovery', 'customer-setup')).toBe(true);
    expect(routeIsAllowed('recovery', 'barber-onboarding')).toBe(true);
    expect(routeIsAllowed('recovery', 'session-error')).toBe(true);
    expect(routeIsAllowed('finish-account', 'customer')).toBe(false);
    expect(routeIsAllowed('customer-setup', 'customer-setup')).toBe(true);
    expect(routeIsAllowed('session-error', 'session-error')).toBe(true);
    expect(routeIsAllowed('session-error', 'auth')).toBe(false);
  });
});
