import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ScreenHeader } from '@/src/components/molecules/ScreenHeader';
import { Screen } from '@/src/components/organisms/Screen';
import { copy } from '@/src/data/copy';
import { useNotifications } from '@/src/hooks/useNotifications';
import { formatNotificationTime, isUnreadNotification } from '@/src/notifications';
import { colors, radii, spacing, typography } from '@/src/theme';

export default function CustomerNotifications() {
  const { items, loading, error, load, markRead } = useNotifications();
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <Screen>
      <ScreenHeader onBack={() => (router.canGoBack() ? router.back() : router.replace('/(customer)/profile'))} />
      <View style={styles.header}>
        <Text style={styles.title}>{copy.customer.notificationsTitle}</Text>
        {items.some(isUnreadNotification) ? (
          <Pressable accessibilityRole="button" accessibilityLabel={copy.customer.markAllRead} onPress={() => void markRead()}>
            <Text style={styles.action}>{copy.customer.markAllRead}</Text>
          </Pressable>
        ) : null}
      </View>
      {loading ? <Text style={styles.muted}>{copy.customer.loading}</Text> : null}
      {error ? <Text style={styles.error}>{copy.auth.failed}</Text> : null}
      {!loading && !items.length ? <Text style={styles.muted}>{copy.customer.notificationsEmpty}</Text> : null}
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          onPress={() => {
            if (isUnreadNotification(item)) void markRead([item.id]);
          }}
          style={[styles.card, isUnreadNotification(item) && styles.unread]}
        >
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.meta}>{formatNotificationTime(item.created_at)}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title, textAlign: 'right', flex: 1 },
  action: { color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  unread: { borderColor: colors.primary, backgroundColor: colors.primaryFixed },
  cardTitle: { color: colors.charcoal, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.label, textAlign: 'right' },
  body: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, textAlign: 'right' },
  meta: { color: colors.outline, fontFamily: typography.fontFamily.regular, fontSize: typography.size.caption, textAlign: 'right' },
  muted: { color: colors.muted, fontFamily: typography.fontFamily.regular, textAlign: 'center' },
  error: { color: colors.danger, fontFamily: typography.fontFamily.regular, textAlign: 'right' },
});
