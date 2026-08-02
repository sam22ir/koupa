import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import type { AppNotification } from '@/src/notifications';
import { Button, CustomerStageHeader, EmptyState, ErrorBanner, Screen } from '@/src/components/ui';
import { useNotifications } from '@/src/hooks/useNotifications';
import { t } from '@/src/i18n';
import { colors, radii, space, typography } from '@/src/theme';

export default function NotificationsScreen() {
  const { items, loading, error, load, markRead } = useNotifications();

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen padded={false}>
      <CustomerStageHeader title={t('notifications.title')} />
      <View style={styles.content}>
        <ErrorBanner error={error || null} />
        <Button
          label={t('notifications.markRead')}
          variant="secondary"
          onPress={() => void markRead()}
        />
        <FlatList
        data={[...items] as AppNotification[]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} /> : <EmptyState title={t('notifications.empty')} />}
        renderItem={({ item }) => (
          <View style={[styles.row, !item.read_at && styles.unread]}>
            <Text style={styles.title}>{item.title ?? t('notifications.title')}</Text>
            {item.body ? <Text style={styles.notificationBody}>{item.body}</Text> : null}
          </View>
        )}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: space[5],
  },
  list: {
    gap: space[3],
    paddingVertical: space[3],
    flexGrow: 1,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[4],
    gap: space[1],
    marginBottom: space[3],
  },
  unread: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  title: {
    ...typography.bodyStrong,
    textAlign: 'right',
  },
  notificationBody: {
    ...typography.caption,
    textAlign: 'right',
  },
});
