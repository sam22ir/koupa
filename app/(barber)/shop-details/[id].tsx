import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/src/components/ui/BackButton';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { CustomerStageHeader } from '@/src/components/ui/CustomerStageHeader';
import { Icon } from '@/src/components/ui/Icon';
import { ErrorBanner } from '@/src/components/ui/ErrorBanner';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Screen } from '@/src/components/ui/Screen';
import { ShopMemberList } from '@/src/features/barber-shop/ShopMemberList';
import { useShops } from '@/src/hooks/useShops';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { membershipStatusLabel } from '@/src/shops';
import { colors, layout, radii, space, typography } from '@/src/theme';
import { goBackFromShopScreen, returnToShopTab } from '@/src/navigation/barberShopNavigation';

export default function ShopDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const shopId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { session } = useAppSession();
  const shops = useShops(session?.user.id);
  const getShop = shops.getShop;
  const [loading, setLoading] = useState(() => Boolean(shopId));
  const [shop, setShop] = useState<Awaited<ReturnType<typeof shops.getShop>>>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const load = useCallback(async () => {
    if (!shopId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setShop(await getShop(shopId));
    setLoading(false);
  }, [getShop, shopId]);

  const confirmDelete = async () => {
    const deleted = await shops.removeShop();
    if (!deleted) return;
    setConfirmingDelete(false);
    returnToShopTab();
  };

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  const header = (
    <CustomerStageHeader
      title={shop?.name ?? t('shopWorkspace.details')}
      subtitle={shop ? [shop.neighborhood, shop.city].filter(Boolean).join('، ') || undefined : undefined}
      context={t('auth.roleBarber')}
      trailing={<BackButton fallback="/(barber)/shop" onPress={goBackFromShopScreen} />}
    />
  );

  if (loading) {
    return (
      <Screen padded={false} scroll>
        {header}
        <View style={styles.body}>
          <Text style={styles.meta}>{t('common.loading')}</Text>
        </View>
      </Screen>
    );
  }

  const relationship = shops.relationship;
  const sameShop = shops.membership?.shop_id === shopId;
  const isOwner = Boolean(shop && shops.ownedShop?.id === shop.id);

  return (
    <Screen padded={false} scroll>
      {header}
      <View style={styles.body}>
      <ErrorBanner error={shops.error || null} />
      {shop ? (
        <>
          <Card elevated style={styles.overview}>
            {shop.bio ? <Text style={styles.bio}>{shop.bio}</Text> : null}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Icon name="person-outline" size={15} color={colors.textMuted} />
                <Text style={styles.meta}>{shop.owner_name}</Text>
              </View>
              <View style={styles.ratingPill}>
                <Icon name="star" size={13} color={colors.accent} />
                <Text style={styles.rating}>{`${shop.average_rating.toFixed(1)} · ${shop.rating_count} تقييم`}</Text>
              </View>
            </View>
            {shop.maps_url ? (
              <Button
                label={t('find.openLocation')}
                variant="secondary"
                onPress={() => void Linking.openURL(shop.maps_url!).catch(() => undefined)}
              />
            ) : null}
          </Card>
          <ShopMemberList members={shop.barbers.map((barber) => ({
            id: barber.id,
            shop_id: shop.id,
            barber_id: barber.id,
            status: 'active',
            barber_name: barber.name,
            barber_phone: barber.phone,
          }))} />
          {isOwner ? null : sameShop && shops.membership ? (
            <Text style={styles.status}>{membershipStatusLabel(shops.membership.status)}</Text>
          ) : relationship.kind === 'none' ? (
            <Button
              label={t('shop.join')}
              onPress={async () => {
                if (await shops.requestJoin(shop.id)) returnToShopTab();
              }}
              loading={shops.saving}
            />
          ) : (
            <Text style={styles.status}>{relationship.kind === 'request' ? t('shopWorkspace.pending') : t('shopWorkspace.invitation')}</Text>
          )}
          {isOwner ? (
            <View style={styles.dangerSection}>
              <Text accessibilityRole="header" style={styles.dangerTitle}>{t('shopWorkspace.deleteShop')}</Text>
              <Text style={styles.dangerBody}>{t('shopWorkspace.deleteConfirmBody')}</Text>
              {confirmingDelete ? (
                <View testID="delete-shop-confirmation" style={styles.deleteConfirmation}>
                  <Text style={styles.deleteConfirmationTitle}>{t('shopWorkspace.deleteConfirmTitle')}</Text>
                  <View style={styles.deleteActions}>
                    <Button
                      label={t('common.cancel')}
                      variant="outline"
                      disabled={shops.saving}
                      onPress={() => setConfirmingDelete(false)}
                      style={styles.deleteAction}
                    />
                    <Button
                      label={t('shopWorkspace.deleteShop')}
                      variant="dangerSolid"
                      accessibilityLabel={t('shopWorkspace.deleteConfirmTitle')}
                      loading={shops.saving}
                      onPress={() => void confirmDelete()}
                      style={styles.deleteAction}
                      testID="delete-shop-confirm"
                    />
                  </View>
                </View>
              ) : (
                <Button
                  label={t('shopWorkspace.deleteShop')}
                  variant="danger"
                  onPress={() => setConfirmingDelete(true)}
                />
              )}
            </View>
          ) : null}
        </>
      ) : (
        <EmptyState
          title={t('shopWorkspace.noSearchResults')}
          actionLabel={t('common.retry')}
          onAction={() => void load()}
        />
      )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[4], paddingHorizontal: layout.screenPaddingX, paddingBottom: space[8] },
  overview: { gap: space[3] },
  bio: { ...typography.body, textAlign: 'right' },
  metaRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: space[3] },
  metaItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[1] },
  meta: { ...typography.caption, textAlign: 'right' },
  ratingPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[1], minHeight: 24, paddingHorizontal: space[2], borderRadius: radii.pill, backgroundColor: colors.accentSoft },
  rating: { ...typography.label, fontSize: 12, lineHeight: 18, color: colors.accentText },
  status: { ...typography.bodyStrong, color: colors.primarySoftText, textAlign: 'right' },
  dangerSection: { gap: space[2], padding: space[4], borderRadius: radii.lg, borderWidth: 1, borderColor: colors.dangerBorder, backgroundColor: colors.surface },
  dangerTitle: { ...typography.bodyStrong, color: colors.danger, textAlign: 'right' },
  dangerBody: { ...typography.caption, textAlign: 'right' },
  deleteConfirmation: { gap: space[3], padding: space[3], borderRadius: radii.md, backgroundColor: colors.dangerSoft },
  deleteConfirmationTitle: { ...typography.bodyStrong, color: colors.danger, textAlign: 'right' },
  deleteActions: { flexDirection: 'row-reverse', gap: space[2] },
  deleteAction: { flex: 1 },
});
