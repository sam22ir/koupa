import {
  classifyAuthCallback,
  getPendingRole,
  getSignupPhone,
  hasSignupConsent,
  hasUnapprovedGoogleCollision,
  isExistingConfirmedEmailSignup,
  isGoogleCollisionMessage,
  isSameSessionForRouting,
  isValidEmail,
  isValidPassword,
  isValidSignInPassword,
  normalizeAlgerianPhone,
  parseAuthCallback,
} from '@/src/auth';
import { formatAuthError } from '@/src/i18n/errors';
import { AppError } from '@/src/services/errors';

describe('auth helpers', () => {
  it.each([
    ['0555123456', '+213555123456'],
    ['+213 555 123 456', '+213555123456'],
    ['213555123456', '+213555123456'],
  ])('normalizes Algerian phone %s', (value, expected) => {
    expect(normalizeAlgerianPhone(value)).toBe(expected);
  });

  it.each(['054512345', '+212555123456', '05551234567', 'not-a-phone'])('rejects invalid Algerian phone %s', (value) => {
    expect(normalizeAlgerianPhone(value)).toBeNull();
  });

  it('requires an eight-character password and a well-formed email', () => {
    expect(isValidPassword('1234567')).toBe(false);
    expect(isValidPassword('12345678')).toBe(true);
    expect(isValidEmail('not an email')).toBe(false);
    expect(isValidEmail('customer@example.com')).toBe(true);
  });

  it('allows the six-character password only for staging test email accounts', () => {
    expect(isValidSignInPassword('123456', 'test.customer@koupa.test', 'development')).toBe(true);
    expect(isValidSignInPassword('123456', 'test.customer@koupa.test', 'production')).toBe(false);
    expect(isValidSignInPassword('123456', 'customer@example.com', 'development')).toBe(false);
  });

  it('reads only supported role and consent metadata', () => {
    const user = { user_metadata: { koupa_role: 'barber', koupa_signup_consent: true } } as never;
    const invalidUser = { user_metadata: { koupa_role: 'admin', koupa_signup_consent: 'true' } } as never;
    expect(getPendingRole(user)).toBe('barber');
    expect(hasSignupConsent(user)).toBe(true);
    expect(getPendingRole(invalidUser)).toBeNull();
    expect(hasSignupConsent(invalidUser)).toBe(false);
  });

  it('reads the signup contact phone from user metadata', () => {
    expect(getSignupPhone({ user_metadata: { koupa_phone: '+213555123456' } } as never)).toBe('+213555123456');
    expect(getSignupPhone({ user_metadata: { koupa_phone: 123 } } as never)).toBeNull();
  });

  it('detects an unapproved Google identity attached to an email/password account', () => {
    expect(hasUnapprovedGoogleCollision({ identities: [{ provider: 'email' }, { provider: 'google' }], user_metadata: {} } as never)).toBe(true);
    expect(hasUnapprovedGoogleCollision({ identities: [{ provider: 'google' }], user_metadata: {} } as never)).toBe(false);
    expect(hasUnapprovedGoogleCollision({ identities: [{ provider: 'email' }, { provider: 'google' }], user_metadata: { koupa_google_linked: true } } as never)).toBe(false);
  });

  it('detects Supabase existing-email signup responses', () => {
    expect(isExistingConfirmedEmailSignup({ identities: [] } as never)).toBe(true);
    expect(isExistingConfirmedEmailSignup({ identities: [{ provider: 'email' }] } as never)).toBe(false);
    expect(isExistingConfirmedEmailSignup(null)).toBe(false);
  });

  it('explains that an existing email should sign in', () => {
    const error = new AppError('UNAUTHORIZED', new Error('User already registered'));
    expect(formatAuthError(error)).toBe('يوجد حساب بهذا البريد. سجّل الدخول للمتابعة.');
  });

  it('parses PKCE, email confirmation, recovery, and provider error callbacks', () => {
    expect(parseAuthCallback('koupa://callback?code=pkce-code')).toEqual({ code: 'pkce-code' });
    expect(parseAuthCallback('koupa://callback?token_hash=confirm&type=email')).toEqual({ token_hash: 'confirm', type: 'email' });
    expect(parseAuthCallback('koupa://callback#token_hash=recovery&type=recovery')).toEqual({ token_hash: 'recovery', type: 'recovery' });
    expect(parseAuthCallback('koupa://callback?error=access_denied&error_code=otp_expired&error_description=Expired')).toEqual({
      error: 'access_denied',
      error_code: 'otp_expired',
      error_description: 'Expired',
    });
  });

  it('classifies callback outcomes for UI routing', () => {
    expect(classifyAuthCallback('koupa://callback?code=pkce-code')).toBe('pkce');
    expect(classifyAuthCallback('koupa://callback?code=pkce-code&flow=recovery')).toBe('recovery');
    expect(classifyAuthCallback('koupa://callback?token_hash=x&type=email')).toBe('signup_confirm');
    expect(classifyAuthCallback('koupa://callback?token_hash=x&type=email_change')).toBe('email_change');
    expect(classifyAuthCallback('koupa://callback#token_hash=x&type=recovery')).toBe('recovery');
    expect(classifyAuthCallback('koupa://callback?error=access_denied&error_code=otp_expired')).toBe('expired');
    expect(classifyAuthCallback('koupa://callback?error=access_denied&error_description=Denied')).toBe('provider_error');
    expect(classifyAuthCallback('koupa://callback')).toBe('unknown');
  });

  it('detects Google collision error messages', () => {
    expect(isGoogleCollisionMessage('Existing password sign-in is required before linking Google')).toBe(true);
    expect(isGoogleCollisionMessage('network failed')).toBe(false);
  });
});

describe('isSameSessionForRouting', () => {
  const session = (metadata: Record<string, unknown>, token = 'token-1') => ({
    access_token: token,
    user: { id: 'user-1', user_metadata: metadata },
  }) as never;

  it('treats an identical session as unchanged', () => {
    expect(isSameSessionForRouting(session({ koupa_role: 'barber' }), session({ koupa_role: 'barber' }))).toBe(true);
  });

  it('sees the consent stamp that Google sign-up writes after the session exists', () => {
    // Same user and token: only user_metadata changed, so routing must refresh.
    const before = session({});
    const after = session({ koupa_role: 'barber', koupa_signup_consent: true });
    expect(isSameSessionForRouting(before, after)).toBe(false);
  });

  it('sees a new token or a signed-out change', () => {
    expect(isSameSessionForRouting(session({}), session({}, 'token-2'))).toBe(false);
    expect(isSameSessionForRouting(session({}), null)).toBe(false);
    expect(isSameSessionForRouting(null, null)).toBe(true);
  });
});
