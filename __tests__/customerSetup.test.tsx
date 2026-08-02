import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
}));

const mockSession = {
  session: {
    user: {
      id: 'customer-1',
      phone: null,
      user_metadata: { koupa_phone: '+213555000000' },
    },
  },
  refreshProfile: jest.fn(),
  signOut: jest.fn(async () => undefined),
};

jest.mock('@/src/providers/SessionProvider', () => ({
  useAppSession: () => mockSession,
}));

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

  it('prefills the signup contact phone and allows changing accounts', async () => {
    await render(<CustomerSetupScreen />);

    expect(screen.getByLabelText('رقم الهاتف')).toHaveDisplayValue('+213555000000');
    await fireEvent.press(screen.getByRole('button', { name: 'تغيير الحساب' }));

    await waitFor(() => {
      expect(mockSession.signOut).toHaveBeenCalledTimes(1);
      expect(router.replace).toHaveBeenCalledWith('/(auth)/welcome');
    });
  });
});
