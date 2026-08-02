import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { appEnvironment } from '@/src/notifications';
import { toAppError } from '@/src/services/errors';

let notificationsModule: Promise<typeof import('expo-notifications')> | null = null;

async function loadNotifications() {
  // Expo Go cannot use full push native path reliably — skip.
  if (Constants.appOwnership === 'expo') return null;
  notificationsModule ??= import('expo-notifications').then((Notifications) => {
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
  if (Platform.OS !== 'android' || !Device.isDevice) return null;
  if (Constants.appOwnership === 'expo') return null;

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
