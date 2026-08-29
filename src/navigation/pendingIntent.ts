import type { Href } from 'expo-router';

import type { AppDestination } from './resolveRoute';

type SearchParams = Readonly<Record<string, string | string[] | undefined>>;

let pendingIntent: string | null = null;

function isAllowedPath(pathname: string): boolean {
  return (
    pathname === '/scan'
    || pathname.startsWith('/book/')
    || pathname.startsWith('/appointment/')
    || pathname === '/notifications'
    || pathname.startsWith('/notification/')
    || pathname.startsWith('/barber-appointment/')
    || pathname === '/today'
    || pathname === '/schedule'
    || pathname === '/shop'
    || pathname === '/shop-create'
    || pathname === '/shop-search'
    || pathname.startsWith('/shop-details/')
    || pathname.startsWith('/shop-member/')
    || pathname.startsWith('/shop-activity/')
    || pathname.startsWith('/(customer)/')
    || pathname.startsWith('/(barber)/')
    || pathname === '/onboarding'
  );
}

function queryString(params: SearchParams): string {
  const query = Object.entries(params)
    .filter(([key, value]) => key !== 'id' && key !== 'barberId' && typeof value === 'string' && value.length > 0)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return query ? `?${query}` : '';
}

export function setPendingIntentFromPath(pathname: string, params: SearchParams): string | null {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (!isAllowedPath(normalized)) return null;
  pendingIntent = `${normalized}${queryString(params)}`;
  return pendingIntent;
}

export function getPendingIntent(): string | null {
  return pendingIntent;
}

function intentMatchesDestination(intent: string, destination: AppDestination): boolean {
  if (destination === 'customer') {
    return intent === '/scan'
      || intent.startsWith('/book/')
      || intent.startsWith('/appointment/')
      || intent === '/notifications'
      || intent.startsWith('/notification/')
      || intent.startsWith('/(customer)/');
  }
  if (destination === 'barber') {
    return intent.startsWith('/barber-appointment/')
      || intent === '/today'
      || intent === '/schedule'
      || intent === '/shop'
      || intent === '/shop-create'
      || intent === '/shop-search'
      || intent.startsWith('/shop-details/')
      || intent.startsWith('/shop-member/')
      || intent.startsWith('/shop-activity/')
      || intent === '/notifications'
      || intent.startsWith('/notification/')
      || intent.startsWith('/(barber)/');
  }
  if (destination === 'barber-onboarding') return intent === '/onboarding';
  return false;
}

export function consumePendingIntent(destination: AppDestination): Href | null {
  const intent = pendingIntent;
  if (!intent) return null;
  // Keep the intent while the session moves through auth, confirmation, legal,
  // and profile setup. It is consumed only once the final workspace matches.
  if (!intentMatchesDestination(intent, destination)) return null;
  pendingIntent = null;
  return intent as Href;
}

export function clearPendingIntent(): void {
  pendingIntent = null;
}
