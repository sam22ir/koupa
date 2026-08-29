const mockSetNotificationHandler = jest.fn();
const mockAddNotificationResponseReceivedListener = jest.fn();
const mockGetLastNotificationResponseAsync = jest.fn();

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: 'standalone' },
}));

jest.mock('expo-device', () => ({ isDevice: true }));

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: mockSetNotificationHandler,
  addNotificationResponseReceivedListener: mockAddNotificationResponseReceivedListener,
  getLastNotificationResponseAsync: mockGetLastNotificationResponseAsync,
}));

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

import {
  isNativePushRuntime,
  notificationResponseDestinationHref,
  subscribeToNotificationResponses,
} from '@/src/services/push';

function notificationResponse(data: unknown) {
  return {
    notification: {
      request: {
        content: { data },
      },
    },
  };
}

describe('native push runtime gate', () => {
  it.each([
    ['web', 'standalone', false],
    ['ios', 'standalone', false],
    ['android', 'expo', false],
    ['android', 'standalone', true],
  ] as const)('allows notifications on %s / %s only when native support exists', (platform, ownership, expected) => {
    expect(isNativePushRuntime(platform, ownership)).toBe(expected);
  });
});

describe('notification response navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps a native notification response through the allowlisted destination resolver', () => {
    expect(notificationResponseDestinationHref(notificationResponse({
      notification_id: 'notification-1',
      appointment_id: 'appointment-1',
      destination: JSON.stringify({ kind: 'appointment', appointmentId: 'appointment-1' }),
    }) as never, 'barber')).toBe('/barber-appointment/appointment-1');
  });

  it('ignores a malformed native notification response payload', () => {
    expect(notificationResponseDestinationHref(notificationResponse({
      notification_id: 42,
      destination: ['not-a-destination'],
    }) as never, 'customer')).toBeNull();
  });

  it('processes the cold-start response once when the listener is set up', async () => {
    const remove = jest.fn();
    mockAddNotificationResponseReceivedListener.mockReturnValue({ remove });
    mockGetLastNotificationResponseAsync.mockResolvedValue(notificationResponse({
      notification_id: 'notification-1',
      appointment_id: 'appointment-1',
      destination: JSON.stringify({ kind: 'appointment', appointmentId: 'appointment-1' }),
    }));
    const navigate = jest.fn();

    const unsubscribe = await subscribeToNotificationResponses('customer', navigate);

    expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalledTimes(1);
    expect(mockGetLastNotificationResponseAsync).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/appointment/appointment-1');
    unsubscribe?.();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('uses the same resolver for a live notification response', async () => {
    let listener: ((response: unknown) => void) | undefined;
    mockAddNotificationResponseReceivedListener.mockImplementation((receivedListener) => {
      listener = receivedListener;
      return { remove: jest.fn() };
    });
    mockGetLastNotificationResponseAsync.mockResolvedValue(null);
    const navigate = jest.fn();

    await subscribeToNotificationResponses('barber', navigate);
    listener?.(notificationResponse({
      notification_id: 'notification-1',
      appointment_id: 'appointment-1',
      destination: JSON.stringify({ kind: 'appointment', appointmentId: 'appointment-1' }),
    }));

    expect(navigate).toHaveBeenCalledWith('/barber-appointment/appointment-1');
  });

});
