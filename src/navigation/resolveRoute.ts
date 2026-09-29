import type { UserRole } from '@/src/data/onboarding';
import type { Profile } from '@/src/services/profile';

export type SessionGateInput = {
  readonly loading: boolean;
  readonly hasSession: boolean;
  /** A signed-out visitor chose to browse barbers without an account. */
  readonly guestBrowsing?: boolean;
  readonly emailConfirmed: boolean;
  readonly pendingConfirmationEmail: string;
  readonly profile: Profile | null;
  readonly pendingRole: UserRole | null;
  /**
   * Whether the account has the signup consent stamped in auth metadata. The
   * database refuses a profile insert without it, so a profileless account
   * missing consent must be repaired before any setup screen is reachable.
   */
  readonly signupConsent?: boolean;
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
  | 'guest'
  | 'confirm'
  | 'finish-account'
  | 'customer-setup'
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
    return input.guestBrowsing ? 'guest' : 'auth';
  }
  // An unconfirmed email no longer blocks setup. Confirmation is enforced
  // where value is exchanged: the appointments insert trigger for customers,
  // and publish_barber_profile for barbers.
  //
  // An incomplete account without a persisted role must pick one before the
  // client attempts a role-guarded profile insert. Missing signup consent
  // lands here too: the profile insert would be refused by the database, and
  // finish-account is the only screen that stamps it.
  if (!input.profile && (!input.pendingRole || input.signupConsent === false)) {
    return 'finish-account';
  }
  // A profileless account cannot proceed without a successful legal sync. A
  // completed profile, however, may continue during a transient document
  // request failure and can retry from its workspace.
  if (!input.profile && input.legalError) return 'finish-account';
  if (input.profile && input.legalConsentRequired) return 'finish-account';
  if (input.profile && input.legalError) {
    // Continue to the immutable database role below; the UI can show a
    // non-blocking retry banner for the failed legal refresh.
  } else if (input.legalConsentRequired || !input.legalAccepted) {
    return 'finish-account';
  }
  if (!input.profile) {
    const role = input.pendingRole;
    if (role === 'barber') return 'barber-onboarding';
    return 'customer-setup';
  }
  // An unpublished barber is a real account with in-app tasks left, not an
  // unfinished wizard. Only a barber with no profile row at all is sent back
  // to setup, which is handled above.
  return input.profile.role === 'barber' ? 'barber' : 'customer';
}
