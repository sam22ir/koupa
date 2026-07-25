import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '@/src/components/molecules/ScreenHeader';
import { Screen } from '@/src/components/organisms/Screen';
import { copy } from '@/src/data/copy';
import { useShops } from '@/src/hooks/useShops';
import { ratingSummaryLabel } from '@/src/ratings';
import type { ShopProfile } from '@/src/shops';
import { colors, radii, spacing, typography } from '@/src/theme';

export default function CustomerShopProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getShop } = useShops();
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    void getShop(id)
      .then((value) => {
        setShop(value);
        if (!value) setError(copy.auth.failed);
      })
      .finally(() => setLoading(false));
  }, [getShop, id]);

  return (
    <Screen>
      <ScreenHeader onBack={() => (router.canGoBack() ? router.back() : router.replace('/(customer)/find'))} />
      {loading ? <Text style={styles.muted}>{copy.common.loading}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {shop ? (
        <>
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="storefront-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.name}>{shop.name}</Text>
            <Text style={styles.meta}>
              {copy.customer.shopOwner}: {shop.owner_name}
            </Text>
            <Text style={styles.rating}>{ratingSummaryLabel(shop.average_rating, shop.rating_count)}</Text>
            {shop.bio ? <Text style={styles.bio}>{shop.bio}</Text> : null}
            {shop.maps_url ? (
              <Text selectable style={styles.meta}>
                {shop.maps_url}
              </Text>
            ) : null}
          </View>
          <View style={styles.section}>
            <Text style={styles.heading}>{copy.customer.shopBarbers}</Text>
            {!shop.barbers.length ? <Text style={styles.meta}>لا يوجد حلاقون متاحون حالياً.</Text> : null}
            {shop.barbers.map((barber) => (
              <Pressable
                key={barber.id}
                accessibilityRole="button"
                accessibilityLabel={`${copy.customer.bookFromShop} ${barber.name}`}
                onPress={() => router.push({ pathname: '/(customer)/booking/[id]', params: { id: barber.id } })}
                style={styles.barberRow}
              >
                <View style={styles.barberText}>
                  <Text style={styles.barberName}>{barber.name}</Text>
                  <Text style={styles.meta}>{barber.is_owner ? copy.customer.shopOwner : copy.customer.bookFromShop}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-left" size={22} color={colors.outline} />
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title },
  meta: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, textAlign: 'right' },
  rating: { color: colors.gold, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body },
  bio: { color: colors.charcoal, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, textAlign: 'center' },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.outlineVariant,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  heading: { color: colors.charcoal, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.label, textAlign: 'right' },
  barberRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  barberText: { flex: 1, gap: spacing.xs },
  barberName: { color: colors.charcoal, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body, textAlign: 'right' },
  muted: { color: colors.muted, fontFamily: typography.fontFamily.regular, textAlign: 'center' },
  error: { color: colors.danger, fontFamily: typography.fontFamily.regular, textAlign: 'right' },
});
