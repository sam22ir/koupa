import type { Href } from 'expo-router';

import { appStorage } from '@/lib/storage';

import type { AppDestination } from './resolveRoute';

type SearchParams = Readonly<Record<string, string | string[] | undefined>>;

let pendingIntent: string | null = null;

// The email-confirmation link can reopen the app cold, so the destination is
// mirrored to storage (best effort).
const STORAGE_KEY = 'koupa:pending-intent:v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

async function writeStored(intent: string | null): Promise<void> {
  try {
    if (intent) await appStorage.setItem(STORAGE_KEY, JSON.stringify({ intent, at: Date.now() }));
    else await appStorage.removeItem(STORAGE_KEY);
  } catch {
    // Persistence is best effort; the in-memory value still works this session.
  }
}

/** Restore a destination saved before the app was closed. Call once at startup. */
export async function hydratePendingIntent(): Promise<void> {
  if (pendingIntent) return;
  try {
    const raw = await appStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as { intent?: unknown; at?: unknown };
    const intent = typeof saved.intent === 'string' ? saved.intent : '';
    const fresh = typeof saved.at === 'number' && Date.now() - saved.at < MAX_AGE_MS;
    const pathname = intent.split('?')[0] ?? '';
    if (intent && fresh && isAllowedPath(pathname) && !pendingIntent) {
      pendingIntent = intent;
    } else if (!fresh || !isAllowedPath(pathname)) {
      await writeStored(null);
    }
  } catch {
    // Corrupt or unavailable storage: ignore.
  }
}

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
  void writeStored(pendingIntent);
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
  void writeStored(null);
  return intent as Href;
}

export function clearPendingIntent(): void {
  pendingIntent = null;
  void writeStored(null);
}
