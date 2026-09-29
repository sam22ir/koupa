import { resolveAppDestination } from '@/src/navigation/resolveRoute';

describe('resolveAppDestination', () => {
  it('routes unauthenticated users to auth', () => {
    expect(
      resolveAppDestination({
        loading: false,
        hasSession: false,
        emailConfirmed: false,
        pendingConfirmationEmail: '',
        profile: null,
        pendingRole: null,
        legalAccepted: false,
        legalConsentRequired: false,
        legalError: null,
      }),
    ).toBe('auth');
  });

  it('routes a signed-out visitor who chose to browse to the guest destination', () => {
    const base = {
      loading: false,
      hasSession: false,
      emailConfirmed: false,
      pendingConfirmationEmail: '',
      profile: null,
      pendingRole: null,
      legalAccepted: false,
      legalConsentRequired: false,
      legalError: null,
    };
    expect(resolveAppDestination({ ...base, guestBrowsing: true })).toBe('guest');
    // A pending email confirmation still wins over browsing.
    expect(
      resolveAppDestination({ ...base, guestBrowsing: true, pendingConfirmationEmail: 'a@b.co' }),
    ).toBe('confirm');
    // Browsing never applies once a session exists.
    expect(
      resolveAppDestination({ ...base, hasSession: true, guestBrowsing: true, pendingRole: null }),
    ).not.toBe('guest');
  });

  it('routes a failed session bootstrap to a retryable session error screen', () => {
    expect(
      resolveAppDestination({
        loading: false,
        hasSession: false,
        emailConfirmed: false,
        pendingConfirmationEmail: '',
        profile: null,
        pendingRole: null,
        legalAccepted: false,
        legalConsentRequired: false,
        legalError: null,
        bootstrapError: 'NETWORK',
      }),
    ).toBe('session-error');
  });

  it('does not send a profile-query failure into onboarding', () => {
    expect(
      resolveAppDestination({
        loading: false,
        hasSession: true,
        emailConfirmed: true,
        pendingConfirmationEmail: '',
        profile: null,
        pendingRole: 'customer',
        legalAccepted: true,
        legalConsentRequired: false,
        legalError: null,
        profileError: 'NETWORK',
      }),
    ).toBe('session-error');
  });

  it('routes pending email confirmation without session', () => {
    expect(
      resolveAppDestination({
        loading: false,
        hasSession: false,
        emailConfirmed: false,
        pendingConfirmationEmail: 'a@b.com',
        profile: null,
        pendingRole: null,
        legalAccepted: false,
        legalConsentRequired: false,
        legalError: null,
      }),
    ).toBe('confirm');
  });

  it('asks profileless signed-in accounts without a role to complete account setup', () => {
    expect(
      resolveAppDestination({
        loading: false,
        hasSession: true,
        emailConfirmed: true,
        pendingConfirmationEmail: '',
        profile: null,
        pendingRole: null,
        legalAccepted: false,
        legalConsentRequired: false,
        legalError: 'LEGAL_SAVE_FAILED',
      }),
    ).toBe('complete-account');
  });

  it('routes customer without profile to setup', () => {
    expect(
      resolveAppDestination({
        loading: false,
        hasSession: true,
        emailConfirmed: true,
        pendingConfirmationEmail: '',
        profile: null,
        pendingRole: 'customer',
        legalAccepted: true,
        legalConsentRequired: false,
        legalError: null,
      }),
    ).toBe('customer-setup');
  });

  it('routes an unpublished barber to the workspace, not back into setup', () => {
    expect(
      resolveAppDestination({
        loading: false,
        hasSession: true,
        emailConfirmed: true,
        pendingConfirmationEmail: '',
        profile: {
          id: '1',
          role: 'barber',
          name: 'Test',
          phone: '+213555000000',
          is_published: false,
        },
        pendingRole: 'barber',
        legalAccepted: true,
        legalConsentRequired: false,
        legalError: null,
      }),
    ).toBe('barber');
  });

  it('lets an unconfirmed email reach customer setup instead of the confirm wall', () => {
    expect(
      resolveAppDestination({
        loading: false,
        hasSession: true,
        emailConfirmed: false,
        pendingConfirmationEmail: '',
        profile: null,
        pendingRole: 'customer',
        signupConsent: true,
        legalAccepted: true,
        legalConsentRequired: false,
        legalError: null,
      }),
    ).toBe('customer-setup');
  });

  it('lets an unconfirmed barber reach setup', () => {
    expect(
      resolveAppDestination({
        loading: false,
        hasSession: true,
        emailConfirmed: false,
        pendingConfirmationEmail: '',
        profile: null,
        pendingRole: 'barber',
        signupConsent: true,
        legalAccepted: true,
        legalConsentRequired: false,
        legalError: null,
      }),
    ).toBe('barber-onboarding');
  });

  it('repairs a profileless account that has a role but no stamped consent', () => {
    // The database refuses the insert without consent, so setup would dead-end.
    expect(
      resolveAppDestination({
        loading: false,
        hasSession: true,
        emailConfirmed: true,
        pendingConfirmationEmail: '',
        profile: null,
        pendingRole: 'barber',
        signupConsent: false,
        legalAccepted: true,
        legalConsentRequired: false,
        legalError: null,
      }),
    ).toBe('complete-account');
  });

  it('routes published customer to customer shell', () => {
    expect(
      resolveAppDestination({
        loading: false,
        hasSession: true,
        emailConfirmed: true,
        pendingConfirmationEmail: '',
        profile: {
          id: '1',
          role: 'customer',
          name: 'Amine',
          phone: '+213555000000',
          is_published: true,
        },
        pendingRole: null,
        legalAccepted: true,
        legalConsentRequired: false,
        legalError: null,
      }),
    ).toBe('customer');
  });

  it('routes a profileless user with failed legal synchronization to recovery', () => {
    expect(
      resolveAppDestination({
        loading: false,
        hasSession: true,
        emailConfirmed: true,
        pendingConfirmationEmail: '',
        profile: null,
        pendingRole: 'customer',
        legalAccepted: false,
        legalConsentRequired: false,
        legalError: 'LEGAL_SAVE_FAILED',
      }),
    ).toBe('legal-error');
  });

  it('keeps an existing profile in its workspace during a transient legal failure', () => {
    expect(
      resolveAppDestination({
        loading: false,
        hasSession: true,
        emailConfirmed: true,
        pendingConfirmationEmail: '',
        profile: {
          id: '1',
          role: 'customer',
          name: 'Amine',
          phone: '+213555000000',
          is_published: true,
        },
        pendingRole: null,
        legalAccepted: false,
        legalConsentRequired: false,
        legalError: 'LEGAL_SAVE_FAILED',
      }),
    ).toBe('customer');
  });

  it('requires explicit consent when an existing profile has an outdated legal version', () => {
    expect(
      resolveAppDestination({
        loading: false,
        hasSession: true,
        emailConfirmed: true,
        pendingConfirmationEmail: '',
        profile: {
          id: '1',
          role: 'customer',
          name: 'Amine',
          phone: '+213555000000',
          is_published: true,
        },
        pendingRole: null,
        legalAccepted: false,
        legalConsentRequired: true,
        legalError: null,
      }),
    ).toBe('legal-consent');
  });
});
