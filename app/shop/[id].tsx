import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ShopProfile } from '@/src/shops';
import {
  Avatar,
  BackButton,
  Button,
  Card,
  CustomerStageHeader,
  EmptyState,
  ErrorBanner,
  Icon,
  Screen,
  SectionHeader,
} from '@/src/components/ui';
import { useShops } from '@/src/hooks/useShops';
import { UgcModerationActions } from '@/src/features/moderation/UgcModerationActions';
import { t } from '@/src/i18n';
import { publicProfileReturnHref } from '@/src/navigation/bookingNavigation';
import { setPendingIntentFromPath } from '@/src/navigation/pendingIntent';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, elevation, radii, space, typography } from '@/src/theme';
import { initialsFromName } from '@/src/utils/initials';
import { getShopOwnerId } from '@/src/services/shops';
import { isUserBlocked } from '@/src/services/ugcModeration';

export default function ShopProfileScreen() {
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const shops = useShops();
  const { profile } = useAppSession();
  const { getShop } = shops;
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [blockedOwnerId, setBlockedOwnerId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const fallback = publicProfileReturnHref(returnTo, profile?.role);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const ownerId = await getShopOwnerId(id).catch(() => null);
    setBlockedOwnerId(ownerId);
    const ownerBlocked = ownerId ? await isUserBlocked(ownerId).catch(() => false) : false;
    setBlocked(ownerBlocked);
    if (ownerBlocked) {
      setShop(null);
      setLoading(false);
      return;
    }
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
      <CustomerStageHeader
        title={shop?.name ?? t('find.shops')}
        subtitle={shop?.owner_name}
        context={t('auth.roleCustomer')}
        trailing={<BackButton fallback={fallback} />}
      />
      <View style={styles.body}>
      <ErrorBanner error={shops.error || null} />
      {loading ? <Text style={styles.meta}>{t('common.loading')}</Text> : null}
      {!loading && shops.error ? <Button label={t('common.retry')} variant="secondary" onPress={() => void load()} /> : null}
      {blocked ? (
        <Card style={styles.moderationCard}>
          <Text style={styles.bio}>{t('moderation.blockedProfile')}</Text>
          {profile?.id && blockedOwnerId ? (
            <UgcModerationActions
              targetKind="shop"
              targetId={id}
              targetName={t('find.shops')}
              blockTargetId={blockedOwnerId}
              blocked
              onBlockChange={(nextBlocked) => {
                setBlocked(nextBlocked);
                if (!nextBlocked) void load();
              }}
            />
          ) : null}
        </Card>
      ) : shop ? (
        <>
          {profile?.id && profile.id !== shop.owner_id ? (
            <Card style={styles.moderationCard}>
              <UgcModerationActions
                targetKind="shop"
                targetId={shop.id}
                targetName={shop.name}
                blockTargetId={shop.owner_id}
                onBlockChange={(nextBlocked) => {
                  setBlocked(nextBlocked);
                  if (nextBlocked) setShop(null);
                }}
              />
            </Card>
          ) : null}
          {shop.bio ? <Text style={styles.bio}>{shop.bio}</Text> : null}
          {shop.maps_url ? <Button label={t('find.openLocation')} variant="secondary" onPress={() => void Linking.openURL(shop.maps_url!).catch(() => undefined)} /> : null}
          <SectionHeader title={t('booking.chooseBarber')} />
          {shop.barbers.length === 0 ? <EmptyState title={t('find.empty')} /> : null}
          {shop.barbers.map((barber) => (
            <Pressable
              key={barber.id}
              accessibilityRole="button"
              accessibilityLabel={barber.name}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
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
              {profile?.role !== 'barber' ? <Icon name="chevron-back" size={18} color={colors.textSubtle} /> : null}
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
    paddingBottom: space[6],
    gap: space[3],
  },
  bio: {
    ...typography.body,
    textAlign: 'right',
    color: colors.textMuted,
  },
  moderationCard: { gap: space[2] },
  row: {
    flexDirection: 'row-reverse',
    gap: space[3],
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: space[4],
    ...elevation.card,
  },
  rowPressed: { backgroundColor: colors.primarySoft },
  copy: {
    flex: 1,
    alignItems: 'flex-end',
  },
  name: {
    ...typography.bodyStrong,
    textAlign: 'right',
  },
  meta: {
    ...typography.caption,
    color: colors.primarySoftText,
    textAlign: 'right',
  },
});
