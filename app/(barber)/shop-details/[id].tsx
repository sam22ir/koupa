import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/src/components/ui/BackButton';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { ErrorBanner } from '@/src/components/ui/ErrorBanner';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Screen } from '@/src/components/ui/Screen';
import { ShopMemberList } from '@/src/features/barber-shop/ShopMemberList';
import { useShops } from '@/src/hooks/useShops';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { membershipStatusLabel } from '@/src/shops';
import { colors, space, typography } from '@/src/theme';

export default function ShopDetailsScreen() {
  const router = useRouter();
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
    router.replace('/shop');
  };

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  if (loading) {
    return (
      <Screen scroll>
        <BackButton fallback="/(barber)/shop" />
        <Text>{t('common.loading')}</Text>
      </Screen>
    );
  }

  const relationship = shops.relationship;
  const sameShop = shops.membership?.shop_id === shopId;
  const location = shop ? [shop.neighborhood, shop.city].filter(Boolean).join('، ') : '';

  return (
    <Screen scroll>
      <BackButton fallback="/(barber)/shop" />
      {shop?.name ? <Text style={styles.heading}>{shop.name}</Text> : null}
      {location ? <Text style={styles.location}>{location}</Text> : null}
      <ErrorBanner error={shops.error || null} />
      {shop ? (
        <>
          <Card style={styles.overview}>
            {shop.bio ? <Text style={styles.body}>{shop.bio}</Text> : null}
            <View style={styles.metaRow}>
              <Text style={styles.meta}>{shop.owner_name}</Text>
              <Text style={styles.meta}>{shop.average_rating.toFixed(1)} · {shop.rating_count} تقييم</Text>
            </View>
            {shop.maps_url ? <Button label={t('find.openLocation')} variant="ghost" onPress={() => void Linking.openURL(shop.maps_url!).catch(() => undefined)} /> : null}
          </Card>
          <ShopMemberList members={shop.barbers.map((barber) => ({
            id: barber.id,
            shop_id: shop.id,
            barber_id: barber.id,
            status: 'active',
            barber_name: barber.name,
            barber_phone: barber.phone,
          }))} />
          {sameShop && shops.membership ? (
            <Text style={styles.status}>{membershipStatusLabel(shops.membership.status)}</Text>
          ) : relationship.kind === 'none' ? (
            <Button
              label={t('shop.join')}
              onPress={async () => {
                if (await shops.requestJoin(shop.id)) router.dismissTo('/(barber)/shop');
              }}
              loading={shops.saving}
            />
          ) : (
            <Text style={styles.status}>{relationship.kind === 'request' ? t('shopWorkspace.pending') : t('shopWorkspace.invitation')}</Text>
          )}
          {shops.ownedShop?.id === shop.id ? (
            <View style={styles.dangerSection}>
              <Text style={styles.dangerTitle}>{t('shopWorkspace.deleteShop')}</Text>
              <Text style={styles.dangerBody}>{t('shopWorkspace.deleteConfirmBody')}</Text>
              {confirmingDelete ? (
                <View testID="delete-shop-confirmation" style={styles.deleteConfirmation}>
                  <Text style={styles.deleteConfirmationTitle}>{t('shopWorkspace.deleteConfirmTitle')}</Text>
                  <Text style={styles.deleteConfirmationBody}>{t('shopWorkspace.deleteConfirmBody')}</Text>
                  <View style={styles.deleteActions}>
                    <Button
                      label={t('common.cancel')}
                      variant="secondary"
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { ...typography.title, textAlign: 'right' },
  location: { ...typography.body, color: colors.textMuted, textAlign: 'right' },
  overview: { gap: space[3] },
  body: { ...typography.body, textAlign: 'right', lineHeight: 24 },
  metaRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: space[3] },
  meta: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  link: { ...typography.caption, color: colors.primary, textAlign: 'right' },
  status: { ...typography.bodyStrong, color: colors.primary, textAlign: 'right' },
  dangerSection: { gap: space[2], paddingTop: space[4] },
  dangerTitle: { ...typography.label, color: colors.danger, textAlign: 'right' },
  dangerBody: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  deleteConfirmation: { gap: space[2], padding: space[3], borderWidth: 1, borderColor: colors.danger, borderRadius: 12, backgroundColor: colors.dangerSoft },
  deleteConfirmationTitle: { ...typography.bodyStrong, color: colors.danger, textAlign: 'right' },
  deleteConfirmationBody: { ...typography.caption, color: colors.text, textAlign: 'right', lineHeight: 21 },
  deleteActions: { flexDirection: 'row-reverse', gap: space[2] },
  deleteAction: { flex: 1 },
});
