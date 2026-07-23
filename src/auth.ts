import type { User } from '@supabase/supabase-js';
import type { UserRole } from '@/src/data/onboarding';

export type { UserRole } from '@/src/data/onboarding';

export type CredentialMethod = 'email' | 'phone';

export function normalizeAlgerianPhone(value: string): string | null {
  const digits = value.replace(/[\s-]/g, '');
  const normalized = digits.startsWith('+213') ? digits : digits.startsWith('213') ? `+${digits}` : digits.startsWith('0') ? `+213${digits.slice(1)}` : null;
  return normalized && /^\+213[567]\d{8}$/.test(normalized) ? normalized : null;
}

export function isValidPassword(value: string): boolean { return value.length >= 8; }
export function isValidEmail(value: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }

export function parseAuthCallback(url: string): Record<string, string> {
  const [base, hash = ''] = url.split('#');
  const query = base.includes('?') ? base.slice(base.indexOf('?') + 1) : '';
  return Object.fromEntries([...new URLSearchParams(query), ...new URLSearchParams(hash)]);
}

export function getPendingRole(user: User | null): UserRole | null {
  const role = user?.user_metadata?.koupa_role;
  return role === 'customer' || role === 'barber' ? role : null;
}

export function hasSignupConsent(user: User | null): boolean { return user?.user_metadata?.koupa_signup_consent === true; }

export function hasUnapprovedGoogleCollision(user: User | null): boolean {
  const providers = user?.identities?.map((identity) => identity.provider) ?? [];
  return providers.includes('google') && providers.includes('email') && user?.user_metadata?.koupa_google_linked !== true;
}
