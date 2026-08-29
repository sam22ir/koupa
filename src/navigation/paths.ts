import type { Href } from 'expo-router';

import type { AppDestination } from './resolveRoute';

/** Href groups for Expo Router redirects from the session gate. */
export function destinationHref(destination: AppDestination): Href {
  switch (destination) {
    case 'loading':
      return '/';
    case 'session-error':
      return '/(auth)/session-error';
    case 'auth':
      return '/(auth)/intro';
    case 'confirm':
      return '/(auth)/confirm';
    case 'customer-setup':
      return '/(auth)/customer-setup';
    case 'legal-consent':
      return '/(auth)/legal-consent';
    case 'legal-error':
      return '/(auth)/legal-error';
    case 'barber-onboarding':
      return '/onboarding';
    case 'customer':
      return '/(customer)/home';
    case 'barber':
      return '/(barber)/today';
  }
}
