import { act, renderHook } from '@testing-library/react-native';

const mockSignInWithPassword = jest.fn();
const mockSignInWithPhone = jest.fn();

jest.mock('@/src/services/auth', () => ({
  signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
  signInWithPhone: (...args: unknown[]) => mockSignInWithPhone(...args),
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

  it('passes phone sign-in through the linked-account auth service', async () => {
    mockSignInWithPhone.mockResolvedValue({
      user: { email: 'barber@example.com', email_confirmed_at: '2026-08-18T00:00:00.000Z' },
    });
    const { result } = await renderHook(() =>
      useAuthActions({
        hasSession: false,
        pendingConfirmationType: 'signup',
        onPendingRole: jest.fn(),
        onPendingConfirmation: jest.fn(),
        onSignedOut: jest.fn(),
      }),
    );

    await act(async () => {
      await result.current.signInWithPhone('+213555000000', 'password123');
    });

    expect(mockSignInWithPhone).toHaveBeenCalledWith('+213555000000', 'password123');
  });
});
