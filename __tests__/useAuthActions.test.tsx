import { act, renderHook } from '@testing-library/react-native';

const mockSignInWithPassword = jest.fn();
const mockSignInWithPhone = jest.fn();
const mockSignInWithGoogle = jest.fn();
const mockGetSession = jest.fn();
const mockSetPendingRoleStorage = jest.fn();
const mockUpdateUserRole = jest.fn();
const mockClearPendingRoleStorage = jest.fn();

jest.mock('@/src/services/auth', () => ({
  signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
  signInWithPhone: (...args: unknown[]) => mockSignInWithPhone(...args),
  signInWithGoogle: (...args: unknown[]) => mockSignInWithGoogle(...args),
  getSession: (...args: unknown[]) => mockGetSession(...args),
  setPendingRoleStorage: (...args: unknown[]) => mockSetPendingRoleStorage(...args),
  updateUserRole: (...args: unknown[]) => mockUpdateUserRole(...args),
  clearPendingRoleStorage: (...args: unknown[]) => mockClearPendingRoleStorage(...args),
}));

jest.mock('@/src/services/sessionCache', () => ({
  clearSessionCaches: jest.fn(),
}));

import { useAuthActions } from '@/src/hooks/useAuthActions';

describe('useAuthActions email authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
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

  it('clears the provisional role when Google sign-up fails before establishing a session', async () => {
    mockSignInWithGoogle.mockRejectedValueOnce(new Error('OAuth failed'));
    const onPendingRole = jest.fn();
    const { result } = await renderHook(() =>
      useAuthActions({
        hasSession: false,
        pendingConfirmationType: 'signup',
        onPendingRole,
        onPendingConfirmation: jest.fn(),
        onSignedOut: jest.fn(),
      }),
    );

    await act(async () => {
      await expect(result.current.signInWithGoogle('barber')).rejects.toThrow('OAuth failed');
    });

    expect(mockClearPendingRoleStorage).toHaveBeenCalledTimes(1);
    expect(onPendingRole).toHaveBeenLastCalledWith(null);
  });

  it('persists a recovered role and signup consent for a confirmed profileless account', async () => {
    const onPendingRole = jest.fn();
    const { result } = await renderHook(() =>
      useAuthActions({
        hasSession: true,
        pendingConfirmationType: 'signup',
        onPendingRole,
        onPendingConfirmation: jest.fn(),
        onSignedOut: jest.fn(),
      }),
    );

    await act(async () => {
      await result.current.confirmProfilelessRole('customer');
    });

    expect(mockUpdateUserRole).toHaveBeenCalledWith('customer', true);
    expect(mockSetPendingRoleStorage).toHaveBeenCalledWith('customer');
    expect(onPendingRole).toHaveBeenCalledWith('customer');
  });
});
