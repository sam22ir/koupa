import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import NotificationEventScreen from '@/app/notification/[id]';

const mockDismissTo = jest.fn();

jest.mock('expo-router', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return {
    router: { dismissTo: (...args: unknown[]) => mockDismissTo(...args) },
    useLocalSearchParams: () => ({ id: 'notification-1' }),
    useFocusEffect: (callback: () => void) => ReactModule.useEffect(callback, [callback]),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

jest.mock('@/src/services/notifications', () => ({
  loadNotification: jest.fn().mockResolvedValue({
    id: 'notification-1',
    title: 'تنبيه',
    body: 'تفاصيل الحدث',
    appointment_id: null,
    destination: { kind: 'unknown-event' },
    read_at: null,
    created_at: '2026-08-17T10:00:00.000Z',
  }),
}));

describe('notification event screen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('dismisses to the notification inbox instead of pushing another copy', async () => {
    await render(<NotificationEventScreen />);
    await screen.findByText('تنبيه');

    await fireEvent.press(screen.getByRole('button', { name: 'العودة إلى الإشعارات' }));

    expect(mockDismissTo).toHaveBeenCalledWith('/notifications');
  });
});
