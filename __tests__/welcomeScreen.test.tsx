import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking } from 'react-native';

import WelcomeScreen from '../app/(auth)/welcome';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

const mockRouter = router as unknown as { push: jest.Mock };

describe('WelcomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('asks only for the path choice', async () => {
    const view = await render(<WelcomeScreen />);

    expect(view.getByText('اختر نوع الحساب')).toBeTruthy();
    expect(view.getByText('اختيارك دائم ولا يمكن تغييره لاحقاً.')).toBeTruthy();
    expect(view.getByTestId('welcome-door-customer')).toBeTruthy();
    expect(view.getByTestId('welcome-door-barber')).toBeTruthy();
  });

  it('shows the customer door what they will actually get', async () => {
    const view = await render(<WelcomeScreen />);
    const door = view.getByTestId('welcome-door-customer');

    const inside = within(door);
    expect(inside.getByText('صالون النخبة')).toBeTruthy();
    expect(inside.getByText('اليوم · 16:30')).toBeTruthy();
    expect(inside.getByText('حلاقة وتصفيف')).toBeTruthy();
    expect(inside.getByText('1,200 دج')).toBeTruthy();
    expect(inside.getByText('هكذا يظهر موعدك بعد الحجز مباشرة.')).toBeTruthy();
  });

  it('keeps the barber door lighter than the customer door', async () => {
    const view = await render(<WelcomeScreen />);
    const barber = view.getByTestId('welcome-door-barber');

    const inside = within(barber);
    expect(inside.getByText('أنا حلاق')).toBeTruthy();
    expect(inside.getByText('أدير جدولي وأستقبل الحجوزات')).toBeTruthy();
    // The preview belongs to the majority path only; equal doors read as a
    // feature grid instead of a choice.
    expect(inside.queryByText('صالون النخبة')).toBeNull();
  });

  it('routes each door to its own role explanation', async () => {
    const view = await render(<WelcomeScreen />);

    await fireEvent.press(view.getByLabelText('أنا زبون'));
    await fireEvent.press(view.getByLabelText('أنا حلاق'));

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenNthCalledWith(1, {
        pathname: '/(auth)/role-intro',
        params: { role: 'customer' },
      });
      expect(mockRouter.push).toHaveBeenNthCalledWith(2, {
        pathname: '/(auth)/role-intro',
        params: { role: 'barber' },
      });
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

    expect(view.getByText('بالمتابعة أنت توافق على الشروط وسياسة الخصوصية.')).toBeTruthy();

    await fireEvent.press(view.getByLabelText('الشروط'));
    await fireEvent.press(view.getByLabelText('الخصوصية'));

    expect(openURL).toHaveBeenNthCalledWith(1, 'https://koupa-website.pages.dev/terms/');
    expect(openURL).toHaveBeenNthCalledWith(2, 'https://koupa-website.pages.dev/privacy/');
    openURL.mockRestore();
  });
});
