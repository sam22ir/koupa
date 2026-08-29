import type { AppDestination } from './resolveRoute';

export type GuardedRoute =
  | 'authenticated'
  | 'public-browse'
  | 'auth'
  | 'confirmation'
  | 'recovery'
  | 'session-error'
  | 'legal-consent'
  | 'legal-error'
  | 'customer-setup'
  | 'barber'
  | 'barber-onboarding'
  | 'customer'
  | null;

export function getGuardedRoute(segments: readonly string[]): GuardedRoute {
  const root = segments[0];
  if (root === 'barber' || root === 'shop') return 'public-browse';
  if (root === '(customer)' || root === 'book' || root === 'appointment' || root === 'scan') {
    return 'customer';
  }
  if (root === '(barber)' || root === 'barber-appointment') return 'barber';
  if (root === 'onboarding') return 'barber-onboarding';
  if (root === 'notifications' || root === 'notification') return 'authenticated';
  if (root === '(auth)') {
    switch (segments[1]) {
      case 'confirm':
        return 'confirmation';
      case 'reset-password':
        return 'recovery';
      case 'session-error':
        return 'session-error';
      case 'legal-consent':
        return 'legal-consent';
      case 'legal-error':
        return 'legal-error';
      case 'customer-setup':
        return 'customer-setup';
      default:
        return 'auth';
    }
  }
  return null;
}

export function routeIsAllowed(route: Exclude<GuardedRoute, null>, destination: AppDestination): boolean {
  if (route === 'public-browse') return true;
  if (route === 'authenticated') return destination === 'customer' || destination === 'barber';
  if (route === 'auth') return destination === 'auth';
  if (route === 'confirmation') return destination === 'confirm';
  if (route === 'recovery') return true;
  if (route === 'session-error') return destination === 'session-error';
  if (route === 'legal-consent') return destination === 'legal-consent';
  if (route === 'legal-error') return destination === 'legal-error';
  if (route === 'customer-setup') return destination === 'customer-setup';
  return destination === route;
}
