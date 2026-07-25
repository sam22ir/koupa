import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { FormField } from '@/src/components/molecules/FormField';
import { CustomerNavigation } from '@/src/components/molecules/CustomerNavigation';
import { Screen } from '@/src/components/organisms/Screen';
import type { BarberSummary } from '@/src/booking';
import { copy } from '@/src/data/copy';
import { useBooking } from '@/src/hooks/useBooking';
import { useShops } from '@/src/hooks/useShops';
import { ratingSummaryLabel } from '@/src/ratings';
import type { ShopSummary } from '@/src/shops';
import { colors, radii, spacing, typography } from '@/src/theme';

type FindTab = 'barbers' | 'shops';

export default function FindBarbers() {
  const { loading: barberLoading, error: barberError, searchBarbers } = useBooking();
  const { searchShops } = useShops();
  const [tab, setTab] = useState<FindTab>('barbers');
  const [query, setQuery] = useState('');
  const [barbers, setBarbers] = useState<readonly BarberSummary[]>([]);
  const [shops, setShops] = useState<readonly ShopSummary[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopError, setShopError] = useState('');

  const searchBarberResults = async (value = query) => {
    const results = await searchBarbers(value);
    if (results) setBarbers(results);
  };

  const searchShopResults = async (value = query) => {
    setShopLoading(true);
    setShopError('');
    const results = await searchShops(value);
    setShopLoading(false);
    if (results) setShops(results);
    else setShopError(copy.auth.failed);
  };

  useEffect(() => {
    void searchBarberResults('');
    void searchShopResults('');
  }, []);

  const loading = tab === 'barbers' ? barberLoading : shopLoading;
  const error = tab === 'barbers' ? barberError : shopError;

  return (
    <Screen footer={<CustomerNavigation active="البحث" />}>
      <View style={styles.content}>
        <Text style={styles.title}>{copy.customer.findTitle}</Text>
        <View style={styles.tabs}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'barbers' }}
            onPress={() => setTab('barbers')}
            style={[styles.tab, tab === 'barbers' && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === 'barbers' && styles.tabTextActive]}>{copy.customer.findBarbersTab}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'shops' }}
            onPress={() => setTab('shops')}
            style={[styles.tab, tab === 'shops' && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === 'shops' && styles.tabTextActive]}>{copy.customer.findShopsTab}</Text>
          </Pressable>
        </View>
        <FormField label="الاسم أو المدينة" value={query} onChangeText={setQuery} placeholder="ابحث بالاسم أو المدينة" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="بحث"
          onPress={() => void (tab === 'barbers' ? searchBarberResults() : searchShopResults())}
          style={styles.search}
        >
          <MaterialCommunityIcons name="magnify" size={22} color={colors.surface} />
          <Text style={styles.searchText}>بحث</Text>
        </Pressable>
        {loading ? <Text style={styles.muted}>{copy.common.loading}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.list}>
          {tab === 'barbers'
            ? !loading && !error && !barbers.length
              ? <Text style={styles.muted}>لا يوجد حلاقون متاحون حالياً.</Text>
              : barbers.map((barber) => (
                  <Pressable
                    key={barber.id}
                    accessibilityRole="button"
                    accessibilityLabel={barber.name}
                    onPress={() => router.push({ pathname: '/(customer)/barber/[id]', params: { id: barber.id } })}
                    style={styles.card}
                  >
                    <View style={styles.avatar}>
                      <MaterialCommunityIcons name="content-cut" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.cardText}>
                      <Text style={styles.name}>{barber.name}</Text>
                      <Text style={styles.meta}>{[barber.city, barber.neighborhood].filter(Boolean).join(' - ') || 'الجزائر'}</Text>
                      {barber.bio ? (
                        <Text numberOfLines={1} style={styles.bio}>
                          {barber.bio}
                        </Text>
                      ) : null}
                    </View>
                    <MaterialCommunityIcons name="chevron-left" size={24} color={colors.outline} />
                  </Pressable>
                ))
            : !loading && !error && !shops.length
              ? <Text style={styles.muted}>{copy.customer.findShopsEmpty}</Text>
              : shops.map((shop) => (
                  <Pressable
                    key={shop.id}
                    accessibilityRole="button"
                    accessibilityLabel={shop.name}
                    onPress={() => router.push({ pathname: '/(customer)/shop/[id]', params: { id: shop.id } })}
                    style={styles.card}
                  >
                    <View style={styles.avatar}>
                      <MaterialCommunityIcons name="storefront-outline" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.cardText}>
                      <Text style={styles.name}>{shop.name}</Text>
                      <Text style={styles.meta}>
                        {copy.customer.shopOwner}: {shop.owner_name}
                      </Text>
                      <Text style={styles.meta}>{ratingSummaryLabel(shop.average_rating, shop.rating_count)}</Text>
                      {shop.bio ? (
                        <Text numberOfLines={1} style={styles.bio}>
                          {shop.bio}
                        </Text>
                      ) : null}
                    </View>
                    <MaterialCommunityIcons name="chevron-left" size={24} color={colors.outline} />
                  </Pressable>
                ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: spacing.md },
  title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title, textAlign: 'right' },
  tabs: { flexDirection: 'row-reverse', gap: spacing.sm },
  tab: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.charcoal, fontFamily: typography.fontFamily.medium, fontSize: typography.size.body },
  tabTextActive: { color: colors.surface, fontFamily: typography.fontFamily.semiBold },
  search: {
    minHeight: 48,
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchText: { color: colors.surface, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body },
  list: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    borderRadius: radii.lg,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.primaryFixed,
  },
  cardText: { flex: 1, gap: spacing.xs },
  name: { color: colors.charcoal, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body, textAlign: 'right' },
  meta: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.caption, textAlign: 'right' },
  bio: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.caption, textAlign: 'right' },
  muted: { color: colors.muted, fontFamily: typography.fontFamily.regular, textAlign: 'center' },
  error: { color: colors.danger, fontFamily: typography.fontFamily.regular, textAlign: 'right' },
});
