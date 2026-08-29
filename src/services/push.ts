import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { Href } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { pushNotificationDestinationHref } from '@/src/notificationDestination';
import { appEnvironment } from '@/src/notifications';
import { toAppError } from '@/src/services/errors';

let notificationsModule: Promise<typeof import('expo-notifications')> | null = null;

export type NotificationResponseDestination = (href: Href) => void;

function notificationResponseData(response: unknown): Record<string, unknown> | null {
  if (!response || typeof response !== 'object') return null;
  const notification = (response as { notification?: unknown }).notification;
  if (!notification || typeof notification !== 'object') return null;
  const request = (notification as { request?: unknown }).request;
  if (!request || typeof request !== 'object') return null;
  const content = (request as { content?: unknown }).content;
  if (!content || typeof content !== 'object') return null;
  const data = (content as { data?: unknown }).data;
  return data && typeof data === 'object' && !Array.isArray(data)
    ? data as Record<string, unknown>
    : null;
}

/** Maps an untrusted native notification response to an allowlisted app route. */
export function notificationResponseDestinationHref(
  response: unknown,
  role: 'customer' | 'barber',
): Href | null {
  const data = notificationResponseData(response);
  if (!data) return null;
  return pushNotificationDestinationHref({
    notification_id: typeof data.notification_id === 'string' ? data.notification_id : undefined,
    appointment_id: typeof data.appointment_id === 'string' ? data.appointment_id : undefined,
    destination: typeof data.destination === 'string' ? data.destination : undefined,
  }, role);
}

export function isNativePushRuntime(
  platform = Platform.OS,
  appOwnership: string | null | undefined = Constants.appOwnership,
): boolean {
  return platform === 'android' && appOwnership !== 'expo';
}

async function loadNotifications() {
  if (!isNativePushRuntime()) return null;
  notificationsModule ??= Promise.resolve().then(() => {
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    return Notifications;
  });
  return notificationsModule;
}

export async function resolveDevicePushToken(): Promise<string | null> {
  // Expo Go / web / emulators: skip rather than crash native modules.
  if (!isNativePushRuntime() || !Device.isDevice) return null;

  try {
    const Notifications = await loadNotifications();
    if (!Notifications) return null;

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return null;

    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });

    // Store the native Android FCM token. The delivery worker sends directly through Firebase.
    const token = await Notifications.getDevicePushTokenAsync();
    return String(token.data);
  } catch {
    return null;
  }
}

export async function subscribeToNotificationResponses(
  role: 'customer' | 'barber',
  navigate: NotificationResponseDestination,
): Promise<(() => void) | null> {
  const Notifications = await loadNotifications();
  if (!Notifications) return null;
  const handleResponse = (response: unknown) => {
    const href = notificationResponseDestinationHref(response, role);
    if (href) navigate(href);
  };
  const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
  try {
    const initialResponse = await Notifications.getLastNotificationResponseAsync();
    if (initialResponse) handleResponse(initialResponse);
  } catch {
    // The live listener remains useful when native startup state is unavailable.
  }
  return () => subscription.remove();
}

export async function registerDevicePushToken(userId: string, token?: string | null): Promise<string | null> {
  const pushToken = token ?? (await resolveDevicePushToken());
  if (!pushToken) return null;

  const { error } = await supabase.from('device_push_tokens').upsert(
    {
      user_id: userId,
      token: pushToken,
      platform: 'android',
      environment: appEnvironment(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,token,environment' },
  );
  if (error) throw toAppError(error);
  return pushToken;
}
