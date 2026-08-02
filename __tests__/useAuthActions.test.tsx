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

describe('useAuthActions confirmation recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('restores email-change state after phone-password sign in', async () => {
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
      await result.current.signInWithPassword('phone', '+213555000000', 'password123');
    });

    expect(onPendingConfirmation).toHaveBeenCalledWith(
      'recovery@example.com',
      'email_change',
    );
  });
});
