import { useCallback, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { BackButton, Button, Card, CustomerStageHeader, EmptyState, ErrorBanner, Screen } from '@/src/components/ui';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { loadBlockedUsers, unblockUser } from '@/src/services/ugcModeration';
import { colors, layout, space, typography } from '@/src/theme';

type BlockedUser = { readonly id: string; readonly name: string };

export default function BlockedUsersScreen() {
  const { profile } = useAppSession();
  const [users, setUsers] = useState<readonly BlockedUser[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await loadBlockedUsers());
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(t('moderation.blockedUsersLoadFailed')));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  const removeBlock = async (user: BlockedUser) => {
    setPendingId(user.id);
    setError(null);
    try {
      await unblockUser(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(t('moderation.blockFailed')));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Screen padded={false} scroll>
      <CustomerStageHeader
        title={t('moderation.blockedUsersTitle')}
        subtitle={t('moderation.blockedUsersBody')}
        context={profile?.role === 'barber' ? t('auth.roleBarber') : t('auth.roleCustomer')}
        trailing={<BackButton fallback={profile?.role === 'barber' ? '/(barber)/profile' : '/(customer)/profile'} />}
      />
      <View style={styles.body}>
        <ErrorBanner error={error} />
        {loading ? <Text style={styles.loading}>{t('common.loading')}</Text> : null}
        {!loading && !users.length && !error ? <EmptyState title={t('moderation.blockedUsersEmpty')} /> : null}
        {users.map((user) => (
          <Card key={user.id} style={styles.userCard}>
            <Text style={styles.name}>{user.name}</Text>
            <Button
              label={t('moderation.unblock')}
              variant="secondary"
              loading={pendingId === user.id}
              disabled={Boolean(pendingId)}
              onPress={() => Alert.alert(
                t('moderation.unblockConfirmTitle'),
                t('moderation.unblockConfirmBody'),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('moderation.unblock'), onPress: () => void removeBlock(user) },
                ],
              )}
            />
          </Card>
        ))}
        <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], paddingHorizontal: layout.screenPaddingX, paddingBottom: space[10] },
  loading: { ...typography.body, color: colors.textMuted, textAlign: 'right' },
  userCard: { gap: space[3] },
  name: { ...typography.bodyStrong, textAlign: 'right' },
});
