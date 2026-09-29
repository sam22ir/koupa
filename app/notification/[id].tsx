import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BackButton, Button, CustomerStageHeader, ErrorBanner, Icon, Screen } from '@/src/components/ui';
import type { AppNotification } from '@/src/notifications';
import * as notificationsService from '@/src/services/notifications';
import { colors, elevation, radii, space, typography } from '@/src/theme';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';

export default function NotificationEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAppSession();
  const [item, setItem] = useState<AppNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setItem(await notificationsService.loadNotification(id));
    } catch (caught) {
      setError(caught);
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  return (
    <Screen padded={false}>
      <CustomerStageHeader
        title="تفاصيل الإشعار"
        context={profile?.role === 'barber' ? t('auth.roleBarber') : t('auth.roleCustomer')}
        trailing={<BackButton fallback="/notifications" />}
      />
      <View style={styles.body}>
        {loading ? <ActivityIndicator color={colors.primary} size="large" /> : null}
        <ErrorBanner error={error} />
        {!loading && item ? (
          <View style={styles.event}>
            <View style={styles.icon}>
              <Icon name="notifications-outline" size={22} color={colors.primarySoftText} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.copy}>{item.body}</Text>
          </View>
        ) : null}
        {!loading && !item && !error ? <Text style={styles.copy}>تعذر العثور على هذا الحدث.</Text> : null}
        {!loading ? <Button label="العودة إلى الإشعارات" variant="ghost" onPress={() => router.dismissTo('/notifications')} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: space[5], gap: space[4] },
  event: { gap: space[2], alignItems: 'flex-end', padding: space[5], borderRadius: radii.lg, backgroundColor: colors.surface, ...elevation.card },
  icon: { width: 44, height: 44, marginBottom: space[2], borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  title: { ...typography.titleSm, textAlign: 'right' },
  copy: { ...typography.body, color: colors.textMuted, textAlign: 'right' },
});
