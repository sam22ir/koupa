import { act, renderHook, waitFor } from '@testing-library/react-native';

const user = {
  id: 'customer-1',
  email: 'customer@example.com',
  email_confirmed_at: '2026-07-29T12:00:00.000Z',
  user_metadata: { koupa_role: 'customer', koupa_signup_consent: true },
};
const mockSession = { access_token: 'token', user };
const profile = {
  id: user.id,
  role: 'customer' as const,
  name: 'Amine',
  phone: '+213555000000',
  is_published: true,
};

const mockLoadProfile = jest.fn();

jest.mock('@/src/services/auth', () => ({
  getSession: jest.fn(async () => mockSession),
  loadPendingRoleStorage: jest.fn(async () => 'customer'),
  loadPendingEmailConfirmationStorage: jest.fn(async () => ({ email: '', type: 'signup' })),
  onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
  signOut: jest.fn(),
}));

jest.mock('@/src/services/profile', () => ({
  loadProfile: (...args: unknown[]) => mockLoadProfile(...args),
}));

jest.mock('@/src/hooks/useLegalAcceptance', () => ({
  useLegalAcceptance: () => ({
    legalAccepted: true,
    legalDocuments: [],
    legalError: null,
    syncLegal: jest.fn(async () => 'customer'),
    resetLegal: jest.fn(),
  }),
}));

jest.mock('@/src/hooks/useAuthActions', () => ({
  useAuthActions: () => ({
    busy: false,
    setPendingRole: jest.fn(),
    clearPendingRole: jest.fn(),
    completeAuthCallback: jest.fn(),
    signInWithGoogle: jest.fn(),
    linkGoogleIdentity: jest.fn(),
    signUpWithPassword: jest.fn(),
    signInWithPassword: jest.fn(),
    requestPasswordReset: jest.fn(),
    updatePassword: jest.fn(),
    resendEmailConfirmation: jest.fn(),
    signOut: jest.fn(),
  }),
}));

import { useSession } from '@/src/hooks/useSession';
import { clearSessionCaches } from '@/src/services/sessionCache';

describe('useSession profile refresh', () => {
  beforeEach(() => {
    clearSessionCaches();
    mockLoadProfile.mockReset();
    mockLoadProfile.mockResolvedValueOnce(null).mockResolvedValueOnce(profile);
  });

  it('bypasses a cached missing profile after onboarding creates it', async () => {
    const { result } = await renderHook(() => useSession());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toBeNull();

    await act(async () => {
      await result.current.refreshProfile();
    });

    expect(mockLoadProfile).toHaveBeenCalledTimes(2);
    expect(result.current.profile).toEqual(profile);
  });
});
