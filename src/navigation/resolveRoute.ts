import type { UserRole } from '@/src/data/onboarding';
import type { Profile } from '@/src/services/profile';

export type SessionGateInput = {
  readonly loading: boolean;
  readonly hasSession: boolean;
  readonly emailConfirmed: boolean;
  readonly pendingConfirmationEmail: string;
  readonly profile: Profile | null;
  readonly pendingRole: UserRole | null;
  readonly legalAccepted: boolean;
  readonly legalConsentRequired: boolean;
  readonly legalError: string | null;
  readonly bootstrapError?: unknown;
  readonly profileError?: unknown;
};

export type AppDestination =
  | 'loading'
  | 'session-error'
  | 'auth'
  | 'confirm'
  | 'customer-setup'
  | 'legal-consent'
  | 'legal-error'
  | 'barber-onboarding'
  | 'customer'
  | 'barber';

/**
 * Pure routing decision for the root session gate.
 * Keeps Expo Router redirects testable without rendering.
 */
export function resolveAppDestination(input: SessionGateInput): AppDestination {
  if (input.loading) return 'loading';
  if (input.bootstrapError) return 'session-error';
  if (input.profileError) return 'session-error';
  if (!input.hasSession) {
    if (input.pendingConfirmationEmail) return 'confirm';
    return 'auth';
  }
  if (!input.emailConfirmed) return 'confirm';
  // A profileless account cannot proceed without a successful legal sync. A
  // completed profile, however, may continue during a transient document
  // request failure and can retry from its workspace.
  if (!input.profile && input.legalError) return 'legal-error';
  if (input.profile && input.legalConsentRequired) return 'legal-consent';
  if (input.profile && input.legalError) {
    // Continue to the immutable database role below; the UI can show a
    // non-blocking retry banner for the failed legal refresh.
  } else if (input.legalConsentRequired || !input.legalAccepted) {
    return 'legal-consent';
  }
  if (!input.profile) {
    const role = input.pendingRole;
    if (role === 'barber') return 'barber-onboarding';
    return 'customer-setup';
  }
  if (input.profile.role === 'barber' && !input.profile.is_published) {
    return 'barber-onboarding';
  }
  return input.profile.role === 'barber' ? 'barber' : 'customer';
}
