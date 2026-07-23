import { getPendingRole, hasSignupConsent, hasUnapprovedGoogleCollision, isValidEmail, isValidPassword, normalizeAlgerianPhone, parseAuthCallback } from '@/src/auth';

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

  it('reads only supported role and consent metadata', () => {
    const user = { user_metadata: { koupa_role: 'barber', koupa_signup_consent: true } } as never;
    const invalidUser = { user_metadata: { koupa_role: 'admin', koupa_signup_consent: 'true' } } as never;
    expect(getPendingRole(user)).toBe('barber');
    expect(hasSignupConsent(user)).toBe(true);
    expect(getPendingRole(invalidUser)).toBeNull();
    expect(hasSignupConsent(invalidUser)).toBe(false);
  });

  it('detects an unapproved Google identity attached to an email/password account', () => {
    expect(hasUnapprovedGoogleCollision({ identities: [{ provider: 'email' }, { provider: 'google' }], user_metadata: {} } as never)).toBe(true);
    expect(hasUnapprovedGoogleCollision({ identities: [{ provider: 'google' }], user_metadata: {} } as never)).toBe(false);
    expect(hasUnapprovedGoogleCollision({ identities: [{ provider: 'email' }, { provider: 'google' }], user_metadata: { koupa_google_linked: true } } as never)).toBe(false);
  });

  it('parses PKCE, email confirmation, recovery, and provider error callbacks', () => {
    expect(parseAuthCallback('koupa://callback?code=pkce-code')).toEqual({ code: 'pkce-code' });
    expect(parseAuthCallback('koupa://callback?token_hash=confirm&type=email')).toEqual({ token_hash: 'confirm', type: 'email' });
    expect(parseAuthCallback('koupa://callback#token_hash=recovery&type=recovery')).toEqual({ token_hash: 'recovery', type: 'recovery' });
    expect(parseAuthCallback('koupa://callback?error=access_denied&error_code=otp_expired&error_description=Expired')).toEqual({ error: 'access_denied', error_code: 'otp_expired', error_description: 'Expired' });
  });
});
