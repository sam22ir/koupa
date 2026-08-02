import { act, renderHook } from '@testing-library/react-native';

const mockSignInWithPassword = jest.fn();

jest.mock('@/src/services/auth', () => ({
  signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
  clearPendingRoleStorage: jest.fn(),
}));

jest.mock('@/src/services/sessionCache', () => ({
  clearSessionCaches: jest.fn(),
}));

import { useAuthActions } from '@/src/hooks/useAuthActions';

describe('useAuthActions email authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('restores signup confirmation state after email-password sign in', async () => {
    mockSignInWithPassword.mockResolvedValue({
      user: {
        email: 'recovery@example.com',
        email_confirmed_at: null,
      },
    });
    const onPendingConfirmation = jest.fn();
    const { result } = await renderHook(() =>
      useAuthActions({
        hasSession: false,
        pendingConfirmationType: 'signup',
        onPendingRole: jest.fn(),
        onPendingConfirmation,
        onSignedOut: jest.fn(),
      }),
    );

    await act(async () => {
      await result.current.signInWithPassword('recovery@example.com', 'password123');
    });

    expect(onPendingConfirmation).toHaveBeenCalledWith(
      'recovery@example.com',
      'signup',
    );
  });
});
