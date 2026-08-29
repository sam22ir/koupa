import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BackButton, Button, CustomerStageHeader, ErrorBanner, Screen } from '@/src/components/ui';
import type { AppNotification } from '@/src/notifications';
import * as notificationsService from '@/src/services/notifications';
import { colors, space, typography } from '@/src/theme';

export default function NotificationEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
      <CustomerStageHeader title="تفاصيل الإشعار" trailing={<BackButton fallback="/notifications" />} />
      <View style={styles.body}>
        {loading ? <ActivityIndicator color={colors.primary} size="large" /> : null}
        <ErrorBanner error={error} />
        {!loading && item ? (
          <View style={styles.event}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.copy}>{item.body}</Text>
          </View>
        ) : null}
        {!loading && !item && !error ? <Text style={styles.copy}>تعذر العثور على هذا الحدث.</Text> : null}
        {!loading ? <Button label="العودة إلى الإشعارات" variant="secondary" onPress={() => router.dismissTo('/notifications')} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: space[5], gap: space[4] },
  event: { gap: space[2] },
  title: { ...typography.titleSm, textAlign: 'right' },
  copy: { ...typography.body, color: colors.textMuted, textAlign: 'right' },
});
