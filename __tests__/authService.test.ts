const mockExchangeCodeForSession = jest.fn();
const mockGetUser = jest.fn();
const mockLinkIdentity = jest.fn();
const mockSignOut = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockFunctionsInvoke = jest.fn();
const mockSetSession = jest.fn();
const mockSignUp = jest.fn();
const mockUnlinkIdentity = jest.fn();
const mockUpdateUser = jest.fn();
const mockVerifyOtp = jest.fn();
const mockOpenAuthSession = jest.fn();
const mockLinkingAddListener = jest.fn(() => ({ remove: jest.fn() }));
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
      setSession: (...args: unknown[]) => mockSetSession(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      unlinkIdentity: (...args: unknown[]) => mockUnlinkIdentity(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
    },
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
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

jest.mock('expo-auth-session', () => ({ makeRedirectUri: jest.fn(() => 'https://localhost:8081/callback') }));
jest.mock('expo-constants', () => ({
  appOwnership: 'standalone',
  executionEnvironment: 'standalone',
}));
jest.mock('expo-linking', () => ({
  addEventListener: (...args: unknown[]) => (mockLinkingAddListener as (...a: unknown[]) => unknown)(...args),
  createURL: jest.fn(() => 'exp://127.0.0.1:8081/--/callback'),
}));
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: (...args: unknown[]) => mockOpenAuthSession(...args),
  dismissAuthSession: jest.fn(),
}));
jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return process.env.TEST_PLATFORM_OS || 'ios';
    },
  },
}));

import {
  completeAuthCallback,
  linkGoogleIdentity,
  signInWithPassword,
  signInWithPhone,
  signUpWithPassword,
} from '@/src/services/auth';

describe('auth callback service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.TEST_PLATFORM_OS;
    delete process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL;
  });

  it('signs up with email/password and stores the required contact phone in metadata', async () => {
    mockSignUp.mockResolvedValue({
      data: { session: null, user: { id: 'email-user', identities: [{ provider: 'email' }] } },
      error: null,
    });

    await expect(signUpWithPassword({
      phone: '+213555000000',
      email: 'customer@example.com',
      password: 'password123',
      role: 'customer',
    })).resolves.toBe('signup');
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'customer@example.com',
      password: 'password123',
      options: {
        emailRedirectTo: 'koupa://callback',
        data: {
          koupa_role: 'customer',
          koupa_signup_consent: true,
          koupa_phone: '+213555000000',
        },
      },
    });
    expect(mockStorageSetItem).toHaveBeenCalledWith(
      'koupa.pending-confirmation-email',
      'customer@example.com',
    );
  });

  it('rejects signup when the required contact phone is missing', async () => {
    await expect(signUpWithPassword({
      email: 'customer@example.com',
      password: 'password123',
      role: 'customer',
    })).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('signs in with the account email and password', async () => {
    const emailSession = {
      access_token: 'email-token',
      user: {
        id: 'email-user',
        email: 'customer@example.com',
        email_confirmed_at: null,
      },
    };
    mockSignInWithPassword.mockResolvedValue({ data: { session: emailSession }, error: null });

    await expect(
      signInWithPassword('customer@example.com', 'password123'),
    ).resolves.toEqual(emailSession);
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'customer@example.com',
      password: 'password123',
    });
    expect(mockStorageSetItem).toHaveBeenCalledWith(
      'koupa.pending-confirmation-email',
      'customer@example.com',
    );
    expect(mockStorageSetItem).toHaveBeenCalledWith(
      'koupa.pending-confirmation-type',
      'signup',
    );
  });

  it('resolves phone sign-in through the linked email session bridge', async () => {
    const phoneSession = {
      access_token: 'phone-token',
      refresh_token: 'phone-refresh-token',
      user: {
        id: 'phone-user',
        email: 'barber@example.com',
        email_confirmed_at: '2026-08-18T00:00:00.000Z',
      },
    };
    mockFunctionsInvoke.mockResolvedValue({ data: phoneSession, error: null });
    mockSetSession.mockResolvedValue({ data: { session: phoneSession }, error: null });

    await expect(signInWithPhone('0555 000 000', 'password123')).resolves.toEqual(phoneSession);
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('sign-in-with-phone', {
      body: { phone: '+213555000000', password: 'password123' },
    });
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'phone-token',
      refresh_token: 'phone-refresh-token',
    });
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

  it('exchanges the same PKCE code only once when two consumers race for it', async () => {
    const user = {
      id: 'race-user',
      identities: [{ provider: 'email' }],
      user_metadata: { koupa_role: 'customer', koupa_signup_consent: true },
    };
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { user }, user },
      error: null,
    });

    // Call with the same code concurrently, as the sign-in screen's inline
    // consumer and the deep-linked /callback route do in production.
    const [first, second] = await Promise.all([
      completeAuthCallback('koupa://callback?code=race-code'),
      completeAuthCallback('koupa://callback?code=race-code'),
    ]);

    expect(first).toEqual({ kind: 'session' });
    expect(second).toEqual({ kind: 'session' });
    // exchangeCodeForSession is resolved once via the shared promise.
    expect(mockExchangeCodeForSession).toHaveBeenCalledTimes(1);
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('race-code');
  });

  it('does not unlink a Google identity being approved when /callback races the link flow', async () => {
    const googleIdentity = { id: 'google-id', provider: 'google' };
    const user = {
      id: 'link-user',
      identities: [{ id: 'email-id', provider: 'email' }, googleIdentity],
      user_metadata: {},
    };
    mockGetUser.mockResolvedValue({ data: { user: { ...user, identities: [user.identities[0]] } }, error: null });
    mockLinkIdentity.mockResolvedValue({ data: { url: 'https://accounts.example/auth' }, error: null });
    mockExchangeCodeForSession.mockResolvedValue({ data: { session: { user }, user }, error: null });
    mockUpdateUser.mockResolvedValue({ data: { user }, error: null });
    mockOpenAuthSession.mockImplementation(async () => {
      // The deep-linked /callback route (no approval flag) wins the race.
      await completeAuthCallback('koupa://callback?code=link-race-code');
      return { type: 'success', url: 'koupa://callback?code=link-race-code' };
    });

    await expect(linkGoogleIdentity()).resolves.toEqual({ kind: 'session' });
    expect(mockUnlinkIdentity).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockUpdateUser).toHaveBeenCalledWith({ data: { koupa_google_linked: true } });
    // A late consumer reuses the result instead of re-exchanging the spent code.
    await completeAuthCallback('koupa://callback?code=link-race-code');
    expect(mockExchangeCodeForSession).toHaveBeenCalledTimes(1);
  });
});
