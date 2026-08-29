import type { Href } from 'expo-router';
import type { UserRole } from '@/src/auth';

type BookingNavigationInput = {
  readonly barberId: string;
  readonly appointmentId?: string;
  readonly returnTo?: string;
};

const customerBrowseOrigins = new Set(['/home', '/find']);

function isExpectedOrigin(returnTo: string, barberId: string, appointmentId?: string): boolean {
  if (returnTo === `/barber/${barberId}`) return true;
  if (/^\/shop\/[^/?#]+$/.test(returnTo)) return true;
  return Boolean(appointmentId && returnTo === `/appointment/${appointmentId}`);
}

/** Resolves only known in-app booking origins, never an arbitrary stored URL. */
export function bookingReturnHref({ barberId, appointmentId, returnTo }: BookingNavigationInput): Href {
  if (returnTo && isExpectedOrigin(returnTo, barberId, appointmentId)) return returnTo as Href;
  return `/barber/${barberId}` as Href;
}

/** Keeps public profile Back controls inside known Customer browse routes. */
export function publicProfileReturnHref(returnTo?: string, role?: UserRole): Href {
  if (returnTo && customerBrowseOrigins.has(returnTo)) return returnTo as Href;
  if (role === 'barber') return '/(barber)/today';
  if (role === 'customer') return '/(customer)/find';
  return '/(auth)/welcome';
}
