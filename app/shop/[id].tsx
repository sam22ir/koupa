import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ShopProfile } from '@/src/shops';
import { Avatar, BackButton, Button, CustomerStageHeader, EmptyState, ErrorBanner, Screen } from '@/src/components/ui';
import { useShops } from '@/src/hooks/useShops';
import { t } from '@/src/i18n';
import { publicProfileReturnHref } from '@/src/navigation/bookingNavigation';
import { setPendingIntentFromPath } from '@/src/navigation/pendingIntent';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, radii, space, typography } from '@/src/theme';
import { initialsFromName } from '@/src/utils/initials';

export default function ShopProfileScreen() {
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const shops = useShops();
  const { profile } = useAppSession();
  const { getShop } = shops;
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const fallback = publicProfileReturnHref(returnTo, profile?.role);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const next = await getShop(id);
    setShop(next);
    setLoading(false);
  }, [getShop, id]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  return (
    <Screen padded={false} scroll>
      <CustomerStageHeader title={shop?.name ?? t('find.shops')} subtitle={shop?.owner_name} trailing={<BackButton fallback={fallback} />} />
      <View style={styles.body}>
      <ErrorBanner error={shops.error || null} />
      {loading ? <Text style={styles.meta}>{t('common.loading')}</Text> : null}
      {!loading && shops.error ? <Button label={t('common.retry')} variant="secondary" onPress={() => void load()} /> : null}
      {shop ? (
        <>
          {shop.bio ? <Text style={styles.bio}>{shop.bio}</Text> : null}
          {shop.maps_url ? <Button label={t('find.openLocation')} variant="secondary" onPress={() => void Linking.openURL(shop.maps_url!).catch(() => undefined)} /> : null}
          <Text style={styles.section}>{t('booking.chooseBarber')}</Text>
          {shop.barbers.length === 0 ? <EmptyState title={t('find.empty')} /> : null}
          {shop.barbers.map((barber) => (
            <Pressable
              key={barber.id}
              style={styles.row}
              onPress={() => {
                const returnTo = `/shop/${shop.id}`;
                if (profile?.role === 'customer') {
                  router.push({ pathname: '/book/[barberId]', params: { barberId: barber.id, returnTo } });
                  return;
                }
                if (profile?.role !== 'barber') {
                  setPendingIntentFromPath(`/book/${barber.id}`, { returnTo });
                  router.push('/(auth)/sign-in');
                }
              }}
              disabled={profile?.role === 'barber'}
            >
              <Avatar initials={initialsFromName(barber.name)} />
              <View style={styles.copy}>
                <Text style={styles.name}>{barber.name}</Text>
                {profile?.role !== 'barber' ? <Text style={styles.meta}>{t('booking.book')}</Text> : null}
              </View>
            </Pressable>
          ))}
        </>
      ) : !loading ? <EmptyState title={t('find.empty')} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: space[5],
    gap: space[3],
  },
  bio: {
    ...typography.body,
    textAlign: 'right',
    color: colors.textMuted,
  },
  section: {
    ...typography.titleSm,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row-reverse',
    gap: space[3],
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: space[4],
    marginBottom: space[3],
  },
  copy: {
    flex: 1,
    alignItems: 'flex-end',
  },
  name: {
    ...typography.bodyStrong,
  },
  meta: {
    ...typography.caption,
    color: colors.primary,
  },
});
