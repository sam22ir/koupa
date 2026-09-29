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
      return '/(auth)/welcome';
    case 'guest':
      return '/(customer)/home';
    case 'confirm':
      return '/(auth)/confirm';
    case 'finish-account':
      // Expo Router's generated route union updates when its type generator runs.
      return '/(auth)/finish-account' as Href;
    case 'customer-setup':
      return '/(auth)/customer-setup';
    case 'barber-onboarding':
      return '/onboarding';
    case 'customer':
      return '/(customer)/home';
    case 'barber':
      return '/(barber)/today';
  }
}
