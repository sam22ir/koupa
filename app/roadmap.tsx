import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton, Card, CustomerStageHeader, EmptyState, ErrorBanner, Icon, Screen, StatusBadge, type IconName, type StatusTone } from '@/src/components/ui';
import { useRoadmap } from '@/src/hooks/useRoadmap';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import type { RoadmapItem, RoadmapStatus } from '@/src/roadmap';
import { colors, layout, radii, space, typography } from '@/src/theme';

const STATUS_ORDER: readonly RoadmapStatus[] = ['in_progress', 'soon', 'planned'];

const STATUS_TONE: Record<RoadmapStatus, StatusTone> = {
  in_progress: 'success',
  soon: 'info',
  planned: 'neutral',
};

function statusLabel(status: RoadmapStatus): string {
  switch (status) {
    case 'in_progress':
      return t('roadmap.inProgress');
    case 'soon':
      return t('roadmap.soon');
    case 'planned':
      return t('roadmap.planned');
  }
}

function RoadmapCard({ item, onVote }: { readonly item: RoadmapItem; readonly onVote: (item: RoadmapItem) => void }) {
  return (
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.iconTile}>
          <Icon name={item.icon as IconName} size={22} color={colors.primarySoftText} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{item.title}</Text>
          {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
        </View>
      </View>
      <View style={styles.cardBottom}>
        <StatusBadge label={statusLabel(item.status)} tone={STATUS_TONE[item.status]} />
        <Pressable
          testID={`roadmap-vote-${item.id}`}
          accessibilityRole="button"
          accessibilityLabel={item.hasVoted ? t('roadmap.voted') : t('roadmap.vote')}
          accessibilityState={{ selected: item.hasVoted }}
          onPress={() => onVote(item)}
          hitSlop={6}
          style={({ pressed }) => [styles.vote, item.hasVoted && styles.voteActive, pressed && styles.votePressed]}
        >
          <Icon
            name={item.hasVoted ? 'thumbs-up' : 'thumbs-up-outline'}
            size={17}
            color={item.hasVoted ? colors.onPrimary : colors.primarySoftText}
          />
          <Text style={[styles.voteText, item.hasVoted && styles.voteTextActive]}>
            {item.hasVoted ? t('roadmap.voted') : t('roadmap.vote')}
          </Text>
          <Text style={[styles.voteCount, item.hasVoted && styles.voteTextActive]}>
            {`${item.voteCount.toLocaleString('ar-DZ')}`}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

export default function RoadmapScreen() {
  const { profile } = useAppSession();
  const { items, loading, error, load, toggleVote } = useRoadmap();
  const profileHref = profile?.role === 'barber' ? '/(barber)/profile' : '/(customer)/profile';

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen padded={false} scroll>
      <CustomerStageHeader
        title={t('roadmap.title')}
        subtitle={t('roadmap.subtitle')}
        context={profile?.role === 'barber' ? t('auth.roleBarber') : t('auth.roleCustomer')}
        trailing={<BackButton fallback={profileHref} />}
      />
      <View style={styles.body}>
        <ErrorBanner error={error} />
        {loading && !items.length ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
        {!loading && !items.length && !error ? (
          <EmptyState icon="trail-sign-outline" title={t('roadmap.empty')} />
        ) : null}
        {STATUS_ORDER.map((status) => {
          const group = items.filter((item) => item.status === status);
          if (!group.length) return null;
          return (
            <View key={status} style={styles.group}>
              <Text accessibilityRole="header" style={styles.groupTitle}>{statusLabel(status)}</Text>
              {group.map((item) => (
                <RoadmapCard key={item.id} item={item} onVote={(row) => void toggleVote(row)} />
              ))}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[5], paddingHorizontal: layout.screenPaddingX, paddingBottom: space[10] },
  loader: { paddingVertical: space[8] },
  group: { gap: space[3] },
  groupTitle: { ...typography.titleSm, textAlign: 'right' },
  card: { gap: space[3] },
  cardTop: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: space[3] },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  copy: { flex: 1, minWidth: 0, gap: 2, alignItems: 'flex-end' },
  title: { ...typography.bodyStrong, textAlign: 'right' },
  description: { ...typography.caption, textAlign: 'right' },
  cardBottom: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  vote: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[2],
    minHeight: 40,
    paddingHorizontal: space[3],
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  voteActive: { backgroundColor: colors.primary },
  votePressed: { opacity: 0.8 },
  voteText: { ...typography.bodyStrong, color: colors.primarySoftText },
  voteTextActive: { color: colors.onPrimary },
  voteCount: { ...typography.numeric, color: colors.primarySoftText },
});
