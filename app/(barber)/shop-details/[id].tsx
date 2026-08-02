import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { ErrorBanner } from '@/src/components/ui/ErrorBanner';
import { Screen, ScreenTitle } from '@/src/components/ui/Screen';
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

  useEffect(() => {
    let active = true;
    if (!shopId) {
      return () => { active = false; };
    }
    void getShop(shopId).then((result) => {
      if (active) {
        setShop(result);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [getShop, shopId]);

  if (loading) return <Screen loading />;

  const relationship = shops.relationship;
  const sameShop = shops.membership?.shop_id === shopId;
  const location = shop ? [shop.neighborhood, shop.city].filter(Boolean).join('، ') : '';

  return (
    <Screen scroll>
      <ScreenTitle title={shop?.name ?? t('shopWorkspace.details')} subtitle={location || undefined} />
      <ErrorBanner error={shops.error || null} />
      {shop ? (
        <>
          <Card style={styles.overview}>
            {shop.bio ? <Text style={styles.body}>{shop.bio}</Text> : null}
            <View style={styles.metaRow}>
              <Text style={styles.meta}>{shop.owner_name}</Text>
              <Text style={styles.meta}>{shop.average_rating.toFixed(1)} · {shop.rating_count} تقييم</Text>
            </View>
            {shop.maps_url ? <Text style={styles.link}>{shop.maps_url}</Text> : null}
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
                if (await shops.requestJoin(shop.id)) router.replace('/shop' as never);
              }}
              loading={shops.saving}
            />
          ) : (
            <Text style={styles.status}>{relationship.kind === 'request' ? t('shopWorkspace.pending') : t('shopWorkspace.invitation')}</Text>
          )}
        </>
      ) : (
        <Text style={styles.body}>{t('shopWorkspace.noSearchResults')}</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  overview: { gap: space[3] },
  body: { ...typography.body, textAlign: 'right', lineHeight: 24 },
  metaRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: space[3] },
  meta: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  link: { ...typography.caption, color: colors.primary, textAlign: 'right' },
  status: { ...typography.bodyStrong, color: colors.primary, textAlign: 'right' },
});
