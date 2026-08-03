import type { AppDestination } from './resolveRoute';

export type GuardedRoute = 'authenticated' | 'barber' | 'barber-onboarding' | 'customer' | null;

export function getGuardedRoute(segments: readonly string[]): GuardedRoute {
  const root = segments[0];
  if (root === '(customer)' || root === 'book' || root === 'appointment' || root === 'scan') {
    return 'customer';
  }
  if (root === '(barber)') return 'barber';
  if (root === 'onboarding') return 'barber-onboarding';
  if (root === 'notifications') return 'authenticated';
  return null;
}

export function routeIsAllowed(route: Exclude<GuardedRoute, null>, destination: AppDestination): boolean {
  if (route === 'authenticated') return destination === 'customer' || destination === 'barber';
  return destination === route;
}
