import type { User } from '@supabase/supabase-js';
import type { UserRole } from '@/src/data/onboarding';

export type { UserRole } from '@/src/data/onboarding';

export type CredentialMethod = 'email' | 'phone';

export function normalizeAlgerianPhone(value: string): string | null {
  const digits = value.replace(/[\s-]/g, '');
  const normalized = digits.startsWith('+213') ? digits : digits.startsWith('213') ? `+${digits}` : digits.startsWith('0') ? `+213${digits.slice(1)}` : null;
  return normalized && /^\+213[567]\d{8}$/.test(normalized) ? normalized : null;
}

export function getSignupPhone(user: User | null): string | null {
  const phone = user?.user_metadata?.koupa_phone;
  return typeof phone === 'string' && phone.trim() ? phone.trim() : null;
}

/** The name given at signup, or the one Google supplied, for prefilling setup. */
export function getSignupName(user: User | null): string {
  const meta = user?.user_metadata ?? {};
  const value = meta.koupa_name ?? meta.full_name ?? meta.name;
  return typeof value === 'string' ? value.trim() : '';
}

export function isValidPassword(value: string): boolean { return value.length >= 8; }
export function isValidSignInPassword(value: string, identifier: string, appEnvironment = process.env.EXPO_PUBLIC_APP_ENV): boolean {
  if (isValidPassword(value)) return true;
  return appEnvironment !== 'production' && /^[^\s@]+@koupa\.test$/i.test(identifier.trim()) && value.length >= 6;
}
export function isValidEmail(value: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }

export function parseAuthCallback(url: string): Record<string, string> {
  const [base, hash = ''] = url.split('#');
  const query = base.includes('?') ? base.slice(base.indexOf('?') + 1) : '';
  return Object.fromEntries([...new URLSearchParams(query), ...new URLSearchParams(hash)]);
}

export type AuthCallbackKind =
  | 'pkce'
  | 'signup_confirm'
  | 'email_change'
  | 'recovery'
  | 'provider_error'
  | 'expired'
  | 'unknown';

/** Classify koupa://callback outcomes for UI routing (not session exchange). */
export function classifyAuthCallback(url: string): AuthCallbackKind {
  const params = parseAuthCallback(url);
  if (params.error || params.error_code || params.error_description) {
    const blob = `${params.error ?? ''} ${params.error_code ?? ''} ${params.error_description ?? ''}`.toLowerCase();
    if (blob.includes('expir') || blob.includes('otp_expired')) return 'expired';
    return 'provider_error';
  }
  if (params.type === 'recovery' || params.type === 'invite' || params.flow === 'recovery' || params.recovery === '1') return 'recovery';
  if (params.code) return 'pkce';
  if (params.type === 'email_change') return 'email_change';
  if (params.type === 'signup' || params.type === 'email' || params.type === 'magiclink') return 'signup_confirm';
  if (params.token_hash) return 'signup_confirm';
  if (params.access_token && params.refresh_token) return 'pkce';
  return 'unknown';
}

export function isGoogleCollisionMessage(message: string): boolean {
  return /linking Google|password sign-in is required before linking Google/i.test(message);
}

/** Supabase hides account existence by returning a user with no identities. */
export function isExistingConfirmedEmailSignup(user: User | null): boolean {
  return Boolean(user && Array.isArray(user.identities) && user.identities.length === 0);
}

export function getPendingRole(user: User | null): UserRole | null {
  const role = user?.user_metadata?.koupa_role;
  return role === 'customer' || role === 'barber' ? role : null;
}

export function hasSignupConsent(user: User | null): boolean {
  return user?.user_metadata?.koupa_signup_consent === true;
}

export function hasUnapprovedGoogleCollision(user: User | null): boolean {
  const providers = user?.identities?.map((identity) => identity.provider) ?? [];
  return (
    providers.includes('google')
    && providers.includes('email')
    && user?.user_metadata?.koupa_google_linked !== true
  );
}
