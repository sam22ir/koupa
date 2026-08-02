const mockExchangeCodeForSession = jest.fn();
const mockGetUser = jest.fn();
const mockLinkIdentity = jest.fn();
const mockSignOut = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockUnlinkIdentity = jest.fn();
const mockUpdateUser = jest.fn();
const mockVerifyOtp = jest.fn();
const mockStorageSetItem = jest.fn(
  async (_key: string, _value: string): Promise<void> => undefined,
);

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
      linkIdentity: (...args: unknown[]) => mockLinkIdentity(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      unlinkIdentity: (...args: unknown[]) => mockUnlinkIdentity(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
    },
  },
}));

jest.mock('@/lib/storage', () => ({
  appStorage: {
    getItem: jest.fn(async () => null),
    setItem: (key: string, value: string) => mockStorageSetItem(key, value),
    removeItem: jest.fn(async () => undefined),
  },
}));

jest.mock('expo-auth-session', () => ({ makeRedirectUri: jest.fn(() => 'koupa://callback') }));
jest.mock('expo-constants', () => ({ appOwnership: 'standalone' }));
jest.mock('expo-linking', () => ({ addEventListener: jest.fn() }));
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

import {
  completeAuthCallback,
  linkGoogleIdentity,
  signInWithPassword,
  signUpWithPassword,
} from '@/src/services/auth';

describe('auth callback service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps a phone session recoverable when recovery-email attachment fails', async () => {
    const phoneSession = {
      access_token: 'phone-token',
      user: { id: 'phone-user', phone: '+213555000000', email: null },
    };
    mockSignUp.mockResolvedValue({ data: { session: phoneSession, user: phoneSession.user }, error: null });
    mockUpdateUser.mockResolvedValueOnce({ error: new Error('network') });

    await expect(signUpWithPassword({
      method: 'phone',
      phone: '+213555000000',
      email: 'recovery@example.com',
      password: 'password123',
      role: 'customer',
    })).rejects.toMatchObject({ code: 'RECOVERY_EMAIL_ATTACH_FAILED' });
    expect(mockSignUp).toHaveBeenCalledTimes(1);
    expect(mockStorageSetItem).toHaveBeenCalledWith(
      'koupa.pending-confirmation-type',
      'email_change',
    );
  });

  it('returns the session and restores phone recovery-email confirmation state', async () => {
    const phoneSession = {
      access_token: 'phone-token',
      user: {
        id: 'phone-user',
        phone: '+213555000000',
        email: 'recovery@example.com',
        email_confirmed_at: null,
      },
    };
    mockSignInWithPassword.mockResolvedValue({ data: { session: phoneSession }, error: null });

    await expect(
      signInWithPassword('phone', '+213555000000', 'password123'),
    ).resolves.toEqual(phoneSession);
    expect(mockStorageSetItem).toHaveBeenCalledWith(
      'koupa.pending-confirmation-email',
      'recovery@example.com',
    );
    expect(mockStorageSetItem).toHaveBeenCalledWith(
      'koupa.pending-confirmation-type',
      'email_change',
    );
  });

  it('does not apply a pending signup role to a password-recovery callback', async () => {
    const recoveryUser = {
      id: 'recovering-user',
      identities: [{ provider: 'email' }],
      user_metadata: { koupa_role: 'customer' },
    };
    mockVerifyOtp.mockResolvedValue({
      data: { session: { user: recoveryUser }, user: recoveryUser },
      error: null,
    });

    await expect(
      completeAuthCallback('koupa://callback?token_hash=recovery-token&type=recovery', 'barber'),
    ).resolves.toEqual({ kind: 'recovery' });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('treats a PKCE recovery callback as recovery before applying a role', async () => {
    const recoveryUser = {
      id: 'recovering-pkce-user',
      identities: [{ provider: 'email' }],
      user_metadata: { koupa_role: 'customer' },
    };
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { user: recoveryUser }, user: recoveryUser },
      error: null,
    });

    await expect(
      completeAuthCallback('koupa://callback?code=recovery-code&flow=recovery', 'barber'),
    ).resolves.toEqual({ kind: 'recovery' });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('uses the user returned by the PKCE exchange', async () => {
    const user = {
      id: 'new-user',
      identities: [{ provider: 'email' }],
      user_metadata: { koupa_role: 'customer', koupa_signup_consent: true },
    };
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { user }, user },
      error: null,
    });
    mockGetUser.mockRejectedValue(new Error('redundant getUser call'));

    await expect(completeAuthCallback('koupa://callback?code=pkce-code')).resolves.toEqual({
      kind: 'session',
    });
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('approves an explicit Google link after password ownership proof', async () => {
    const googleIdentity = { id: 'google-id', provider: 'google' };
    const user = {
      id: 'existing-user',
      identities: [{ id: 'email-id', provider: 'email' }, googleIdentity],
      user_metadata: {},
    };
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { user }, user },
      error: null,
    });
    mockUpdateUser.mockResolvedValue({ data: { user }, error: null });

    await expect(
      completeAuthCallback('koupa://callback?code=link-code', undefined, true),
    ).resolves.toEqual({ kind: 'session' });
    expect(mockUpdateUser).toHaveBeenCalledWith({
      data: { koupa_google_linked: true },
    });
    expect(mockUnlinkIdentity).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('approves a Google identity that is already attached after password proof', async () => {
    const user = {
      id: 'existing-user',
      identities: [{ id: 'email-id', provider: 'email' }, { id: 'google-id', provider: 'google' }],
      user_metadata: {},
    };
    mockGetUser.mockResolvedValue({ data: { user }, error: null });
    mockUpdateUser.mockResolvedValue({ data: { user }, error: null });

    await expect(linkGoogleIdentity()).resolves.toEqual({ kind: 'session' });
    expect(mockUpdateUser).toHaveBeenCalledWith({
      data: { koupa_google_linked: true },
    });
    expect(mockLinkIdentity).not.toHaveBeenCalled();
  });
});
