import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking } from 'react-native';

import WelcomeScreen from '../app/(auth)/welcome';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

const mockStartGuestBrowsing = jest.fn();
jest.mock('@/src/providers/SessionProvider', () => ({
  useAppSession: () => ({ startGuestBrowsing: mockStartGuestBrowsing }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

const mockRouter = router as unknown as { push: jest.Mock; replace: jest.Mock };

describe('WelcomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('asks only for the path choice', async () => {
    const view = await render(<WelcomeScreen />);

    expect(view.getByText('كيف ستستخدم كوپا؟')).toBeTruthy();
    expect(view.getByTestId('welcome-door-customer')).toBeTruthy();
    expect(view.getByTestId('welcome-door-barber')).toBeTruthy();
  });

  it('tells the customer they can browse without an account', async () => {
    const view = await render(<WelcomeScreen />);
    const inside = within(view.getByTestId('welcome-door-customer'));

    expect(inside.getByText('تصفح الحلاقين')).toBeTruthy();
    expect(inside.getByText('اطّلع على الحلاقين والأسعار والمواعيد المتاحة بدون حساب.')).toBeTruthy();
    expect(inside.getByText('تحتاج إلى حساب فقط عند تأكيد الحجز.')).toBeTruthy();
  });

  it('states the permanent account type only on the barber door', async () => {
    const view = await render(<WelcomeScreen />);
    const barber = within(view.getByTestId('welcome-door-barber'));
    const customer = within(view.getByTestId('welcome-door-customer'));

    expect(barber.getByText('أنا حلاق')).toBeTruthy();
    expect(barber.getByText('تحدد خدماتك وساعات عملك وتتابع الحجوزات.')).toBeTruthy();
    expect(barber.getByText('لا يمكن تغيير نوع الحساب بعد إنشاء الحساب.')).toBeTruthy();
    expect(customer.queryByText('لا يمكن تغيير نوع الحساب بعد إنشاء الحساب.')).toBeNull();
  });

  it('lets a customer browse as a guest without opening signup', async () => {
    const view = await render(<WelcomeScreen />);

    await fireEvent.press(view.getByTestId('welcome-door-customer'));

    expect(mockStartGuestBrowsing).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('sends a barber to barber signup', async () => {
    const view = await render(<WelcomeScreen />);

    await fireEvent.press(view.getByTestId('welcome-door-barber'));

    expect(mockStartGuestBrowsing).not.toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(auth)/sign-up',
      params: { role: 'barber' },
    });
  });

  it('routes existing users to sign-in', async () => {
    const view = await render(<WelcomeScreen />);

    await fireEvent.press(view.getByRole('link', { name: 'لدي حساب بالفعل' }));

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/(auth)/sign-in',
        params: {},
      });
    });
  });

  it('keeps legal notice visible and links live', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const view = await render(<WelcomeScreen />);

    expect(view.getByText('قبل إنشاء الحساب، ستراجع الشروط وسياسة الخصوصية وتوافق عليهما.')).toBeTruthy();

    await fireEvent.press(view.getByLabelText('الشروط'));
    await fireEvent.press(view.getByLabelText('الخصوصية'));

    expect(openURL).toHaveBeenNthCalledWith(1, 'https://koupa-website.pages.dev/terms/');
    expect(openURL).toHaveBeenNthCalledWith(2, 'https://koupa-website.pages.dev/privacy/');
    openURL.mockRestore();
  });
});
