import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Icon } from '@/src/components/ui';
import { t } from '@/src/i18n';
import { callGraceMinutesLeft, type MyQueueEntry } from '@/src/queue';
import { colors, radii, space, typography } from '@/src/theme';
import { Alert } from '@/src/utils/alert';

type Props = {
  readonly entry: MyQueueEntry;
  readonly leaving: boolean;
  readonly error: string;
  readonly onLeave: () => void;
};

const digits = (value: number) => value.toLocaleString('ar-DZ');

/** The customer's place in a barber's line: position while waiting, a call, or in the chair. */
export function MyQueueCard({ entry, leaving, error, onLeave }: Props) {
  const called = entry.status === 'called';
  const serving = entry.status === 'serving';
  const ahead = entry.position ? entry.position - 1 : 0;

  const confirmLeave = () => {
    Alert.alert(t('queue.mineLeaveConfirmTitle'), t('queue.mineLeaveConfirmBody'), [
      { text: t('common.no'), style: 'cancel' },
      { text: t('common.yes'), style: 'destructive', onPress: onLeave },
    ]);
  };

  return (
    <Card elevated style={[styles.card, called && styles.cardCalled]} testID="my-queue-card">
      <View style={styles.header}>
        <View style={[styles.iconWrap, called && styles.iconWrapCalled]}>
          <Icon name={called ? 'notifications' : 'people'} size={20} color={called ? colors.onPrimary : colors.primarySoftText} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.kicker}>{t('queue.mineTitle')}</Text>
          <Text numberOfLines={1} style={styles.barber}>
            {`${t('queue.mineWith')} ${entry.barber_name}`}
            {entry.service_name ? ` · ${entry.service_name}` : ''}
          </Text>
        </View>
      </View>

      {serving ? (
        <Text style={styles.headline}>{t('queue.mineServing')}</Text>
      ) : called ? (
        <>
          <Text style={[styles.headline, styles.headlineCalled]}>{t('queue.mineCalledTitle')}</Text>
          <Text style={styles.body}>
            {`${t('queue.mineCalledBody')} (${digits(callGraceMinutesLeft(entry.called_at))} ${t('common.minutes')})`}
          </Text>
        </>
      ) : (
        <View style={styles.positionRow}>
          <View style={styles.positionBlock}>
            <Text style={styles.positionLabel}>{t('queue.minePosition')}</Text>
            <Text accessibilityLabel={`${t('queue.minePosition')} ${digits(entry.position ?? 0)}`} style={styles.positionValue}>
              {digits(entry.position ?? 0)}
            </Text>
          </View>
          <View style={styles.facts}>
            <Text style={styles.fact}>{`${t('queue.mineAhead')}: ${digits(ahead)}`}</Text>
            <Text style={styles.fact}>{`${digits(entry.waiting_count)} ${t('queue.mineWaitingTotal')}`}</Text>
          </View>
        </View>
      )}

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

      {serving ? null : leaving ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Button label={t('queue.mineLeave')} variant="danger" onPress={confirmLeave} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[3] },
  cardCalled: { borderWidth: 1, borderColor: colors.primary },
  header: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[3] },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  iconWrapCalled: { backgroundColor: colors.primary },
  copy: { flex: 1, minWidth: 0, alignItems: 'flex-end', gap: 2 },
  kicker: { ...typography.label, color: colors.textMuted, textAlign: 'right' },
  barber: { ...typography.bodyStrong, textAlign: 'right' },
  headline: { ...typography.titleSm, textAlign: 'right' },
  headlineCalled: { color: colors.primarySoftText },
  body: { ...typography.body, color: colors.textMuted, textAlign: 'right' },
  positionRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[4] },
  positionBlock: { alignItems: 'center', minWidth: 72 },
  positionLabel: { ...typography.caption, color: colors.textMuted },
  positionValue: { ...typography.title, fontSize: 40, lineHeight: 52, color: colors.primarySoftText },
  facts: { flex: 1, alignItems: 'flex-end', gap: space[1] },
  fact: { ...typography.body, textAlign: 'right' },
  error: { ...typography.caption, color: colors.danger, textAlign: 'right' },
});
