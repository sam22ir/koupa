import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { isUnreadNotification, type AppNotification } from '@/src/notifications';
import { notificationDestinationHref } from '@/src/notificationDestination';
import { BackButton, CustomerStageHeader, EmptyState, ErrorBanner, Icon, Screen } from '@/src/components/ui';
import { useNotifications } from '@/src/hooks/useNotifications';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, elevation, layout, radii, space, typography } from '@/src/theme';

const timeFormatter = new Intl.DateTimeFormat('ar-DZ', {
  timeZone: 'Africa/Algiers',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function formatWhen(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : timeFormatter.format(date);
}

export default function NotificationsScreen() {
  const { items, loading, error, load, markRead } = useNotifications();
  const { profile } = useAppSession();
  const profileHref = profile?.role === 'barber' ? '/(barber)/profile' : '/(customer)/profile';
  const unread = items.filter(isUnreadNotification).length;

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen padded={false}>
      <CustomerStageHeader
        title={t('notifications.title')}
        context={profile?.role === 'barber' ? t('auth.roleBarber') : t('auth.roleCustomer')}
        trailing={
          <BackButton
            fallback={profileHref}
            // Opened from the bell on Home/Today or from Account: go back there.
            // A cold link (e.g. a push tap) has no history, so use Account.
            onPress={() => (router.canGoBack() ? router.back() : router.dismissTo(profileHref))}
          />
        }
      />
      <View style={styles.content}>
        <ErrorBanner error={error || null} />
        {unread ? (
          <View style={styles.toolbar}>
            <Text style={styles.unreadCount}>{`${unread.toLocaleString('ar-DZ')} ${t('notifications.unreadCount')}`}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('notifications.markAllRead')}
              hitSlop={8}
              onPress={() => void markRead()}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={styles.markAll}>{t('notifications.markAllRead')}</Text>
            </Pressable>
          </View>
        ) : null}
        <FlatList
          data={[...items] as AppNotification[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <EmptyState icon="notifications-outline" title={t('notifications.empty')} body={t('notifications.emptyBody')} />
            )
          }
          renderItem={({ item }) => {
            const isUnread = isUnreadNotification(item);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.title ?? t('notifications.title')}
                style={({ pressed }) => [styles.row, isUnread && styles.rowUnread, pressed && styles.rowPressed]}
                onPress={() => {
                  void markRead([item.id]);
                  router.push(notificationDestinationHref(item, profile?.role ?? 'customer'));
                }}
              >
                <View style={[styles.icon, isUnread && styles.iconUnread]}>
                  <Icon
                    name={item.appointment_id ? 'calendar-outline' : 'notifications-outline'}
                    size={19}
                    color={isUnread ? colors.onPrimary : colors.primarySoftText}
                  />
                </View>
                <View style={styles.copy}>
                  <Text style={[styles.title, !isUnread && styles.titleRead]}>{item.title ?? t('notifications.title')}</Text>
                  {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
                  <Text style={styles.when}>{formatWhen(item.created_at)}</Text>
                </View>
                {isUnread ? <View accessibilityLabel={t('notifications.unreadCount')} style={styles.dot} /> : null}
              </Pressable>
            );
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: layout.screenPaddingX,
    gap: space[3],
  },
  toolbar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unreadCount: { ...typography.label, color: colors.textMuted, textAlign: 'right' },
  markAll: { ...typography.label, color: colors.primarySoftText },
  pressed: { opacity: 0.6 },
  list: {
    gap: space[2],
    paddingBottom: space[8],
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: space[3],
    padding: space[4],
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  rowUnread: { ...elevation.card },
  rowPressed: { backgroundColor: colors.primarySoft },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  iconUnread: { backgroundColor: colors.primary },
  copy: { flex: 1, minWidth: 0, gap: 2, alignItems: 'flex-end' },
  title: { ...typography.bodyStrong, textAlign: 'right' },
  titleRead: { fontFamily: typography.body.fontFamily, color: colors.textMuted },
  body: { ...typography.caption, textAlign: 'right' },
  when: { ...typography.caption, fontSize: 11, lineHeight: 16, color: colors.textSubtle, textAlign: 'right' },
  dot: { width: 8, height: 8, marginTop: space[2], borderRadius: 4, backgroundColor: colors.primary },
});
