import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

const mockSession = {
  session: {
    user: {
      id: 'customer-1',
      phone: null,
      user_metadata: { koupa_phone: '+213555000000' } as Record<string, string>,
    },
  },
  refreshProfile: jest.fn(),
  signOut: jest.fn(async () => undefined),
};

jest.mock('@/src/providers/SessionProvider', () => ({
  useAppSession: () => mockSession,
}));

jest.mock('@/src/services/account', () => ({ deleteOwnAccount: jest.fn() }));

jest.mock('@/src/hooks/useOnboarding', () => ({
  useOnboarding: () => ({ createCustomer: jest.fn() }),
}));

jest.mock('@/src/services/onboarding', () => ({
  createCustomerProfile: jest.fn(),
}));

import CustomerSetupScreen from '../app/(auth)/customer-setup';

describe('CustomerSetupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lets a customer who cannot finish setup delete the account', async () => {
    await render(<CustomerSetupScreen />);

    expect(screen.getByTestId('setup-delete-account')).toBeTruthy();
  });

  it('prefills the name from a Google account', async () => {
    const original = mockSession.session.user.user_metadata;
    mockSession.session.user.user_metadata = { ...original, full_name: 'سارة بن علي' };
    try {
      await render(<CustomerSetupScreen />);
      expect(screen.getByDisplayValue('سارة بن علي')).toBeTruthy();
    } finally {
      mockSession.session.user.user_metadata = original;
    }
  });

  it('prefills the signup contact phone and allows changing accounts', async () => {
    await render(<CustomerSetupScreen />);

    expect(screen.getByText('4/4')).toBeTruthy();
    expect(screen.getByText('مرحبا بك في كوپا')).toBeTruthy();
    expect(screen.getByText('خطوة واحدة وابدأ الحجز.')).toBeTruthy();
    expect(screen.queryByText('خطوة واحدةحدة وابدأ الحجز.')).toBeNull();
    expect(screen.getByLabelText('رقم الهاتف')).toHaveDisplayValue('+213555000000');
    expect(screen.getByText('نستخدمه ليتواصل معك الحلاق بعد تأكيد الموعد.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ابدأ استخدام كوپا' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'تغيير الحساب' }));

    await waitFor(() => {
      expect(mockSession.signOut).toHaveBeenCalledTimes(1);
      expect(router.replace).toHaveBeenCalledWith('/(auth)/welcome');
    });
  });
});
