import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BackButton, Button, Card, CustomerStageHeader, ErrorBanner, Icon, Screen } from '@/src/components/ui';
import { ShopActivityList, type ShopActivityItem } from '@/src/features/barber-shop/ShopActivityList';
import { useShops } from '@/src/hooks/useShops';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { shopActivityActionLabel } from '@/src/shops';
import { colors, elevation, layout, radii, space, typography } from '@/src/theme';
import { goBackFromShopScreen } from '@/src/navigation/barberShopNavigation';

function isWithinWeek(value: string, now = Date.now()): boolean {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && now - timestamp <= 7 * 24 * 60 * 60 * 1000;
}

function participants(item: ShopActivityItem): string {
  return [item.actorName, item.affectedBarberName].filter(Boolean).join(' · ');
}

export default function ShopActivityScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const shopId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { session } = useAppSession();
  const { error, getActivity } = useShops(session?.user.id);
  const [items, setItems] = useState<readonly ShopActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!shopId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setItems((await getActivity(shopId)) ?? []);
    setLoading(false);
  }, [getActivity, shopId]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  const latest = items[0];
  const recentCount = items.filter((item) => isWithinWeek(item.createdAt)).length;

  return (
    <Screen padded={false} scroll style={styles.screen}>
      <CustomerStageHeader
        title={t('shopWorkspace.activity')}
        context={t('auth.roleBarber')}
        trailing={<BackButton fallback="/(barber)/shop" onPress={goBackFromShopScreen} />}
      />

      <View style={styles.body}>
        <ErrorBanner error={error || null} />
        {!loading && error ? <Button label={t('shopWorkspace.retry')} variant="secondary" onPress={() => void load()} /> : null}
        {loading ? <ActivityIndicator testID="activity-loading" color={colors.primary} size="large" /> : null}
        {!loading && !error && items.length ? (
          <>
            <View testID="activity-summary" style={styles.metricsRow}>
              <Metric label={t('shopWorkspace.activityTotal')} value={items.length} />
              <Metric label={t('shopWorkspace.activityWeek')} value={recentCount} />
            </View>
            {latest ? (
              <Card style={styles.latestCard}>
                <View style={styles.latestLabelRow}>
                  <Text style={styles.latestLabel}>{t('shopWorkspace.activityLatest')}</Text>
                  <View style={styles.latestIcon}><Icon name="pulse-outline" size={20} color={colors.primary} /></View>
                </View>
                <Text style={styles.latestAction}>{shopActivityActionLabel(latest.action)}</Text>
                <Text style={styles.latestMeta}>{participants(latest) || t('shopWorkspace.activity')}</Text>
              </Card>
            ) : null}
            {items.length > 1 ? (
              <View style={styles.recentSection}>
                <Text style={styles.sectionTitle}>{t('shopWorkspace.activityRecent')}</Text>
                <ShopActivityList items={items.slice(1)} />
              </View>
            ) : null}
          </>
        ) : null}
        {!loading && !error && !items.length ? (
          <Card testID="activity-empty" style={styles.emptyCard}>
            <View style={styles.emptyIcon}><Icon name="pulse-outline" size={28} color={colors.primary} /></View>
            <Text style={styles.emptyTitle}>{t('shopWorkspace.noActivity')}</Text>
            <Text style={styles.emptyBody}>{t('shopWorkspace.activityEmptyBody')}</Text>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <View style={styles.metric} accessible accessibilityLabel={`${label}، ${value}`}>
      <Text style={styles.metricValue}>{value.toLocaleString('ar-DZ')}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  body: { flex: 1, gap: space[4], paddingHorizontal: layout.screenPaddingX, paddingBottom: space[10] },
  metricsRow: { flexDirection: 'row-reverse', gap: space[3] },
  metric: { flex: 1, minHeight: 82, alignItems: 'flex-end', justifyContent: 'center', gap: space[1], borderRadius: radii.lg, backgroundColor: colors.surface, padding: space[4], ...elevation.card },
  metricValue: { ...typography.title, color: colors.primary, textAlign: 'right' },
  metricLabel: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  latestCard: { gap: space[2], padding: layout.cardPadding },
  latestLabelRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  latestLabel: { ...typography.label, color: colors.textMuted, textAlign: 'right' },
  latestIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.primarySoft },
  latestAction: { ...typography.titleSm, textAlign: 'right' },
  latestMeta: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  recentSection: { gap: space[2] },
  sectionTitle: { ...typography.bodyStrong, textAlign: 'right' },
  emptyCard: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: layout.cardPadding },
  emptyIcon: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.primarySoft },
  emptyTitle: { ...typography.titleSm, textAlign: 'center' },
  emptyBody: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 24 },
});
