import { fireEvent, render, screen } from '@testing-library/react-native';

import NotificationsScreen from '@/app/notifications';

const mockPush = jest.fn();
const mockMarkRead = jest.fn().mockResolvedValue(true);

jest.mock('expo-router', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return {
    router: { push: (...args: unknown[]) => mockPush(...args), dismissTo: jest.fn() },
    useFocusEffect: (callback: () => void) => ReactModule.useEffect(callback, [callback]),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

jest.mock('@/src/hooks/useNotifications', () => ({
  useNotifications: () => ({
    items: [{
      id: 'notification-1',
      title: 'موعدك',
      body: 'تم تحديث الموعد',
      appointment_id: 'appointment-1',
      destination: { kind: 'appointment', appointmentId: 'appointment-1' },
      read_at: null,
      created_at: '2026-08-05T10:00:00Z',
    }],
    loading: false,
    error: '',
    load: jest.fn(),
    markRead: mockMarkRead,
  }),
}));

jest.mock('@/src/providers/SessionProvider', () => ({
  useAppSession: () => ({ profile: { role: 'customer' } }),
}));

describe('notifications screen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marks a notification read and opens its appointment', async () => {
    await render(<NotificationsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'موعدك' }));

    expect(mockMarkRead).toHaveBeenCalledWith(['notification-1']);
    expect(mockPush).toHaveBeenCalledWith('/appointment/appointment-1');
  });

  it('uses the current role Profile as the cold-link Back fallback', async () => {
    await render(<NotificationsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'رجوع' }));

    const expoRouter = jest.requireMock('expo-router') as { router: { dismissTo: jest.Mock } };
    expect(expoRouter.router.dismissTo).toHaveBeenCalledWith('/(customer)/profile');
  });
});
