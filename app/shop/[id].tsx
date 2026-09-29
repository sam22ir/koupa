import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ShopProfile } from '@/src/shops';
import {
  Avatar,
  BackButton,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Icon,
  Screen,
  SectionHeader,
  Stage,
} from '@/src/components/ui';
import { useShops } from '@/src/hooks/useShops';
import { UgcModerationActions } from '@/src/features/moderation/UgcModerationActions';
import { t } from '@/src/i18n';
import { publicProfileReturnHref } from '@/src/navigation/bookingNavigation';
import { useAppSession } from '@/src/providers/SessionProvider';
import { RatingPill } from '@/src/features/customer-find/DirectoryCard';
import { colors, elevation, layout, radii, space, typography } from '@/src/theme';
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
    <Screen padded={false} scroll bleedTop>
      <Stage overlap>
        <View style={styles.backRow}>
          <BackButton fallback={fallback} tone="onPrimary" />
        </View>
        <View style={styles.identityRow}>
          <Avatar initials={initialsFromName(shop?.name ?? t('find.shops'))} size={64} tone="stage" />
          <View style={styles.identityCopy}>
            <Text accessibilityRole="header" style={styles.identityName}>{shop?.name ?? t('find.shops')}</Text>
            {shop && [shop.neighborhood, shop.city].filter(Boolean).length ? (
              <View style={styles.metaRow}>
                <Icon name="location-outline" size={14} color={colors.onPrimaryMuted} />
                <Text style={styles.identityLocation}>{[shop.neighborhood, shop.city].filter(Boolean).join('، ')}</Text>
              </View>
            ) : shop?.owner_name ? <Text style={styles.identityLocation}>{shop.owner_name}</Text> : null}
            {shop ? <RatingPill average={shop.average_rating} /> : null}
          </View>
        </View>
      </Stage>
      <View style={[styles.body, styles.lifted]}>
      <ErrorBanner error={shops.error || null} />
      {loading ? <ShopSkeleton /> : null}
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
          {shop.bio || shop.maps_url ? (
            <Card elevated style={styles.aboutCard}>
              {shop.bio ? <Text style={styles.bio}>{shop.bio}</Text> : null}
              {shop.maps_url ? (
                <Button label={t('find.openLocation')} variant="secondary" onPress={() => void Linking.openURL(shop.maps_url!).catch(() => undefined)} />
              ) : null}
            </Card>
          ) : null}
          <SectionHeader title={t('find.shopBarbers')} />
          {shop.barbers.length === 0 ? <EmptyState title={t('find.empty')} /> : null}
          {shop.barbers.map((barber) => (
            <Pressable
              key={barber.id}
              accessibilityRole="button"
              accessibilityLabel={barber.name}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => router.push({ pathname: '/barber/[id]', params: { id: barber.id, returnTo: `/shop/${shop.id}` } })}
            >
              <Avatar initials={initialsFromName(barber.name)} />
              <View style={styles.copy}>
                <Text style={styles.name}>{barber.name}</Text>
                {profile?.role !== 'barber' ? <Text style={styles.meta}>{t('find.bookWithBarber')}</Text> : null}
              </View>
              {profile?.role !== 'barber' ? <Icon name="chevron-back" size={18} color={colors.textSubtle} /> : null}
            </Pressable>
          ))}
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
        </>
      ) : !loading ? <EmptyState title={t('find.empty')} /> : null}
      </View>
    </Screen>
  );
}

function ShopSkeleton() {
  return (
    <View testID="shop-profile-skeleton" style={styles.skeleton}>
      <View style={styles.skeletonCard} />
      <View style={styles.skeletonCard} />
    </View>
  );
}

const styles = StyleSheet.create({
  lifted: { marginTop: layout.stageBodyOverlap },
  backRow: { alignItems: 'flex-start' },
  identityRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[4] },
  identityCopy: { flex: 1, minWidth: 0, alignItems: 'flex-end', gap: space[1] },
  metaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[1] },
  identityName: { ...typography.title, color: colors.onPrimary, textAlign: 'right' },
  identityLocation: { ...typography.caption, color: colors.onPrimaryMuted, textAlign: 'right' },
  aboutCard: { gap: space[3] },
  skeleton: { gap: space[3] },
  skeletonCard: { height: 72, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
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
