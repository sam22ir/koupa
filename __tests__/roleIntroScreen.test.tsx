import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking } from 'react-native';

import RoleIntroScreen from '../app/(auth)/role-intro';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), dismissTo: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ role: 'customer' })),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

const mockSession = {
  setPendingRole: jest.fn(),
};

jest.mock('../src/providers/SessionProvider', () => ({
  useAppSession: () => mockSession,
}));

const mockRouter = router as unknown as { push: jest.Mock; dismissTo: jest.Mock };
const mockSearchParams = useLocalSearchParams as jest.Mock;

describe('RoleIntroScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.mockReturnValue({ role: 'customer' });
  });

  it('explains the customer path in three points', async () => {
    const view = await render(<RoleIntroScreen />);

    expect(view.getByTestId('role-intro-headline')).toBeTruthy();
    expect(view.getByText('احجز موعد حلاقتك بدون انتظار')).toBeTruthy();
    expect(view.getByText('ما تحصل عليه كزبون')).toBeTruthy();
    expect(view.getByText('حجز مؤكد بوقت وخدمة واضحين')).toBeTruthy();
    expect(view.getByText('رمز QR يغلق موعدك عند الوصول')).toBeTruthy();
    expect(view.getByText('كل مواعيدك في مكان واحد')).toBeTruthy();
  });

  it('explains the barber path instead when the role is barber', async () => {
    mockSearchParams.mockReturnValue({ role: 'barber' });
    const view = await render(<RoleIntroScreen />);

    expect(view.getByText('أدِر صالونك ونظّم يومك')).toBeTruthy();
    expect(view.getByText('ما تحصل عليه كحلاق')).toBeTruthy();
    expect(view.getByText('ساعات عمل مرنة مع استثناءات وفترات راحة')).toBeTruthy();
    expect(view.queryByText('كل مواعيدك في مكان واحد')).toBeNull();
  });

  it('refuses to continue without consent', async () => {
    const view = await render(<RoleIntroScreen />);

    await fireEvent.press(view.getByTestId('role-intro-continue'));

    await waitFor(() => {
      expect(view.getByText('يجب الموافقة على الشروط والخصوصية')).toBeTruthy();
    });
    expect(mockSession.setPendingRole).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('stores the pending role then opens sign-up', async () => {
    const view = await render(<RoleIntroScreen />);

    await fireEvent.press(view.getByTestId('role-intro-consent'));
    await fireEvent.press(view.getByTestId('role-intro-continue'));

    await waitFor(() => {
      expect(mockSession.setPendingRole).toHaveBeenCalledWith('customer');
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/(auth)/sign-up',
        params: { role: 'customer' },
      });
    });
  });

  it('links out to the live legal documents', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const view = await render(<RoleIntroScreen />);

    await fireEvent.press(view.getByLabelText('الشروط'));
    await fireEvent.press(view.getByLabelText('الخصوصية'));

    expect(openURL).toHaveBeenNthCalledWith(1, 'https://koupa-website.pages.dev/terms/');
    expect(openURL).toHaveBeenNthCalledWith(2, 'https://koupa-website.pages.dev/privacy/');
    openURL.mockRestore();
  });
});
