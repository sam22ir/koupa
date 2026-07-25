import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { appEnvironment } from '@/src/notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function resolveExpoPushToken(): Promise<string | null> {
  if (Platform.OS !== 'android' || !Device.isDevice) return null;

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId;
  const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return token.data;
}

export function usePushRegistration(userId?: string) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState('');

  const register = useCallback(async () => {
    if (!userId) return null;
    try {
      setError('');
      const pushToken = await resolveExpoPushToken();
      if (!pushToken) return null;
      const { error: upsertError } = await supabase.from('device_push_tokens').upsert(
        {
          user_id: userId,
          token: pushToken,
          platform: 'android',
          environment: appEnvironment(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,token,environment' },
      );
      if (upsertError) throw upsertError;
      setToken(pushToken);
      return pushToken;
    } catch {
      setError('failed');
      return null;
    }
  }, [userId]);

  useEffect(() => {
    void register();
  }, [register]);

  return { token, error, register };
}
