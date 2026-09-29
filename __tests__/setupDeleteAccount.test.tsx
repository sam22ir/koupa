import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

const mockDeleteOwnAccount = jest.fn();
jest.mock('@/src/services/account', () => ({
  deleteOwnAccount: (...args: unknown[]) => mockDeleteOwnAccount(...args),
}));

const mockSignOut = jest.fn();
jest.mock('@/src/providers/SessionProvider', () => ({
  useAppSession: () => ({ signOut: mockSignOut }),
}));

import { SetupDeleteAccount } from '@/src/features/account/SetupDeleteAccount';

async function confirmDeletion() {
  await fireEvent.press(screen.getByRole('button', { name: 'حذف الحساب' }));
  await fireEvent.press(screen.getByRole('button', { name: 'نعم' }));
}

describe('SetupDeleteAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteOwnAccount.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);
  });

  it('explains the option and asks for confirmation before deleting anything', async () => {
    await render(<SetupDeleteAccount />);

    expect(screen.getByText(/يمكنك حذف هذا الحساب نهائيا/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'حذف الحساب' }));

    expect(mockDeleteOwnAccount).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'لا' })).toBeTruthy();
  });

  it('deletes the account, signs out and returns to the start', async () => {
    await render(<SetupDeleteAccount />);

    await confirmDeletion();

    await waitFor(() => expect(mockDeleteOwnAccount).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('still leaves setup when signing out fails after the account is gone', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('session not found'));
    await render(<SetupDeleteAccount />);

    await confirmDeletion();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  it('stays on the screen when deletion fails', async () => {
    mockDeleteOwnAccount.mockRejectedValueOnce(new Error('boom'));
    await render(<SetupDeleteAccount />);

    await confirmDeletion();

    await waitFor(() => expect(mockDeleteOwnAccount).toHaveBeenCalled());
    expect(router.replace).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
