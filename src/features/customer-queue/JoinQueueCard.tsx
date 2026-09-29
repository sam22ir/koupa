import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Icon } from '@/src/components/ui';
import { t } from '@/src/i18n';
import type { PublicQueueStatus } from '@/src/queue';
import { colors, space, typography } from '@/src/theme';

type Props = {
  readonly status: PublicQueueStatus;
  /** Barbers see that their own queue is open but cannot join a line. */
  readonly canJoin: boolean;
  readonly guest: boolean;
  readonly serviceChosen: boolean;
  readonly joining: boolean;
  readonly error: string;
  readonly onJoin: () => void;
};

/** "Queue open · N waiting" on a barber's profile, with the join action. */
export function JoinQueueCard({ status, canJoin, guest, serviceChosen, joining, error, onJoin }: Props) {
  if (!status.queue_open) return null;
  return (
    <Card style={styles.card} testID="join-queue-card">
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Icon name="people-outline" size={20} color={colors.primarySoftText} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{t('queue.joinTitle')}</Text>
          <Text style={styles.count}>
            {`${status.waiting_count.toLocaleString('ar-DZ')} ${t('queue.joinWaiting')}`}
          </Text>
        </View>
      </View>
      {canJoin ? (
        <>
          {!guest && !serviceChosen ? <Text style={styles.hint}>{t('queue.joinHint')}</Text> : null}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Button
            label={guest ? t('queue.joinSignIn') : t('queue.joinCta')}
            variant="secondary"
            disabled={!guest && !serviceChosen}
            loading={joining}
            onPress={onJoin}
          />
        </>
      ) : (
        <Text style={styles.hint}>{t('queue.joinBarberNote')}</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[3] },
  header: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[3] },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  copy: { flex: 1, alignItems: 'flex-end', gap: 2 },
  title: { ...typography.bodyStrong, textAlign: 'right' },
  count: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  hint: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  error: { ...typography.caption, color: colors.danger, textAlign: 'right' },
});
