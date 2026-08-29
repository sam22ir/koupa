import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { BarberSummary } from '@/src/booking';
import { formatDistanceKm, type GeoPoint } from '@/src/location';
import type { ShopSummary } from '@/src/shops';
import { Button, CustomerStageHeader, EmptyState, ErrorBanner, Icon, Screen } from '@/src/components/ui';
import { directoryRatingText } from '@/src/features/customer-find/directoryRating';
import { useBooking } from '@/src/hooks/useBooking';
import { useDeviceLocation } from '@/src/hooks/useDeviceLocation';
import { useShops } from '@/src/hooks/useShops';
import { t } from '@/src/i18n';
import { consumeCustomerFindCityPreference } from '@/src/navigation/customerFindPreference';
import { SEARCH_PAGE_SIZE } from '@/src/services';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/fonts';
import { radii } from '@/src/theme/radii';
import { space } from '@/src/theme/spacing';
import { typography } from '@/src/theme/typography';

type Directory = 'barbers' | 'shops';

export default function FindScreen() {
  const { searchBarbers, loading: bookingLoading, error: bookingError } = useBooking();
  const { searchShops, searchNearbyShops, loading: shopsLoading, error: shopsError } = useShops();
  const { request: requestLocation, status: locationStatus } = useDeviceLocation();
  const [directory, setDirectory] = useState<Directory>('barbers');
  const [query, setQuery] = useState('');
  const [barbers, setBarbers] = useState<readonly BarberSummary[]>([]);
  const [shops, setShops] = useState<readonly ShopSummary[]>([]);
  const [nearbyOrigin, setNearbyOrigin] = useState<GeoPoint | null>(null);
  const [locationMessage, setLocationMessage] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [minimumRating, setMinimumRating] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const searchRequestRef = useRef(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadRef = useRef(false);
  const cityFilterRef = useRef('');

  const runSearch = useCallback(async (
    nextQuery: string,
    kind: Directory,
    nextPage = 0,
    append = false,
    origin: GeoPoint | null = nearbyOrigin,
    city = cityFilterRef.current,
  ) => {
    const requestId = ++searchRequestRef.current;
    setSearched(true);
    setLoadingMore(true);
    try {
      if (kind === 'barbers') {
        const result = await searchBarbers(nextQuery, city, nextPage);
        if (requestId !== searchRequestRef.current) return;
        if (result == null) {
          if (!append) {
            setBarbers([]);
            setHasMore(false);
          }
          return;
        }
        const items = result;
        setBarbers((prev) => (append ? [...prev, ...items] : items));
        setHasMore(items.length === SEARCH_PAGE_SIZE);
      } else {
        const result = origin
          ? await searchNearbyShops(origin.latitude, origin.longitude, nextQuery, nextPage)
          : await searchShops(nextQuery, nextPage);
        if (requestId !== searchRequestRef.current) return;
        if (result == null) {
          if (!append) {
            setShops([]);
            setHasMore(false);
          }
          return;
        }
        const items = result;
        setShops((prev) => (append ? [...prev, ...items] : items));
        setHasMore(items.length === SEARCH_PAGE_SIZE);
      }
      setPage(nextPage);
    } finally {
      if (requestId === searchRequestRef.current) setLoadingMore(false);
    }
  }, [nearbyOrigin, searchBarbers, searchNearbyShops, searchShops]);

  const clearSearchTimer = useCallback(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = null;
  }, []);

  const scheduleSearch = useCallback((nextQuery: string) => {
    clearSearchTimer();
    searchTimerRef.current = setTimeout(() => {
      searchTimerRef.current = null;
      void runSearch(nextQuery.trim(), directory, 0, false);
    }, 350);
  }, [clearSearchTimer, directory, runSearch]);

  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    void (async () => {
      const preferredCity = await consumeCustomerFindCityPreference();
      if (preferredCity) {
        setQuery(preferredCity);
        await runSearch(preferredCity, 'barbers', 0, false, null, preferredCity);
        // One-shot preference: do not keep city locked for later searches.
        cityFilterRef.current = '';
        return;
      }
      await runSearch('', 'barbers');
    })();
  }, [runSearch]);

  useEffect(() => clearSearchTimer, [clearSearchTimer]);

  const onSubmit = () => {
    clearSearchTimer();
    void runSearch(query.trim(), directory, 0, false);
  };

  const visibleBarbers = barbers.filter((item) => item.average_rating >= minimumRating);
  const visibleShops = shops.filter((item) => item.average_rating >= minimumRating);

  const toggleNearbySearch = async () => {
    clearSearchTimer();
    setLocationMessage('');
    if (nearbyOrigin) {
      setNearbyOrigin(null);
      setDirectory('shops');
      void runSearch(query.trim(), 'shops', 0, false, null);
      return;
    }

    const origin = await requestLocation();
    if (!origin) {
      setLocationMessage(t('find.nearMeUnavailable'));
      return;
    }
    setNearbyOrigin(origin);
    setDirectory('shops');
    void runSearch(query.trim(), 'shops', 0, false, origin);
  };

  return (
    <Screen padded={false}>
      <CustomerStageHeader title={t('find.title')} subtitle={t('find.subtitle')} tone="paper" />
      <View style={styles.body}>
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <TextInput
            accessibilityLabel={t('find.placeholder')}
            value={query}
            onChangeText={(nextQuery) => {
              setQuery(nextQuery);
              scheduleSearch(nextQuery);
            }}
            onSubmitEditing={onSubmit}
            placeholder={t('find.placeholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            textAlign="right"
            returnKeyType="search"
          />
          <Pressable
            onPress={() => {
              if (query.trim()) {
                onSubmit();
                return;
              }
              void runSearch('', directory, 0, false);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('common.search')}
          >
            <Icon name={query.trim() ? 'arrow-back-circle' : 'search-outline'} size={22} color={colors.primary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('find.filters')}
            accessibilityState={{ expanded: filterOpen }}
            onPress={() => setFilterOpen((open) => !open)}
            style={[styles.filterButton, filterOpen && styles.filterButtonActive]}
          >
            <Icon name="options-outline" size={22} color={colors.primary} />
          </Pressable>
        </View>
        <Button
          label={nearbyOrigin ? t('find.nearMeActive') : t('find.nearMe')}
          variant={nearbyOrigin ? 'primary' : 'secondary'}
          loading={locationStatus === 'requesting'}
          onPress={() => void toggleNearbySearch()}
        />
        {nearbyOrigin ? <Text style={styles.nearbyStatus}>{t('find.nearMeResults')}</Text> : null}
        {locationMessage ? <Text style={styles.locationMessage}>{locationMessage}</Text> : null}
        {filterOpen ? (
          <View style={styles.filterPanel}>
            <Text style={styles.filterTitle}>{t('find.ratingFilter')}</Text>
            <View style={styles.ratingOptions}>
              {[
                { value: 0, label: t('find.allRatings') },
                { value: 4, label: t('find.rating4') },
                { value: 4.5, label: t('find.rating45') },
              ].map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: minimumRating === option.value }}
                  onPress={() => setMinimumRating(option.value)}
                  style={[styles.ratingOption, minimumRating === option.value && styles.ratingOptionSelected]}
                >
                  <Text style={[styles.ratingOptionText, minimumRating === option.value && styles.ratingOptionTextSelected]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        <View style={styles.segment}>
          {(['barbers', 'shops'] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityLabel={value === 'barbers' ? t('find.barbers') : t('find.shops')}
              accessibilityState={{ selected: directory === value }}
              onPress={() => {
                clearSearchTimer();
                setDirectory(value);
                void runSearch(query.trim(), value, 0, false);
              }}
              style={[styles.segmentItem, directory === value && styles.segmentOn]}
            >
              <Text style={[styles.segmentText, directory === value && styles.segmentTextOn]}>
                {value === 'barbers' ? t('find.barbers') : t('find.shops')}
              </Text>
            </Pressable>
          ))}
        </View>
        <ErrorBanner error={searched ? (directory === 'barbers' ? bookingError : shopsError) : ''} />
      </View>

      {directory === 'barbers' ? (
        <FlatList
          testID="find-barbers-list"
          data={[...visibleBarbers]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            searched && !bookingLoading && !loadingMore ? (
              <EmptyState
                title={t('find.empty')}
                body={t('find.emptyBody')}
                actionLabel={nearbyOrigin ? t('find.nearMeActive') : t('find.nearMe')}
                onAction={() => void toggleNearbySearch()}
              />
            ) : null
          }
          ListFooterComponent={loadingMore || bookingLoading ? <ActivityIndicator color={colors.primary} /> : null}
          onEndReached={() => {
            if (hasMore && !loadingMore) void runSearch(query.trim(), 'barbers', page + 1, true);
          }}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}، ${t('find.viewDetails')}`} style={({ pressed }) => [styles.rowCard, pressed && styles.rowCardPressed]} onPress={() => router.push({ pathname: '/barber/[id]', params: { id: item.id, returnTo: '/find' } })}>
              <Text style={styles.rowTitle} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.rowMeta} numberOfLines={1}>{[item.neighborhood, item.city].filter(Boolean).join('، ')}</Text>
              <View style={styles.rowFooter}>
                <Text style={styles.rowRating}>{directoryRatingText(item.average_rating, t('find.noRatings'))}</Text>
                <Text style={styles.rowPrice}>{t('find.fromPrice')} {item.starting_price_dzd} {t('common.dzd')}</Text>
              </View>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          testID="find-shops-list"
          data={[...visibleShops]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            searched && !shopsLoading && !loadingMore ? (
              <EmptyState
                title={t('find.empty')}
                body={t('find.emptyBody')}
                actionLabel={nearbyOrigin ? t('find.nearMeActive') : t('find.nearMe')}
                onAction={() => void toggleNearbySearch()}
              />
            ) : null
          }
          ListFooterComponent={loadingMore || shopsLoading ? <ActivityIndicator color={colors.primary} /> : null}
          onEndReached={() => {
            if (hasMore && !loadingMore) void runSearch(query.trim(), 'shops', page + 1, true);
          }}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}، ${t('find.viewDetails')}`} style={({ pressed }) => [styles.rowCard, pressed && styles.rowCardPressed]} onPress={() => router.push({ pathname: '/shop/[id]', params: { id: item.id, returnTo: '/find' } })}>
              <Text style={styles.rowTitle} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.rowMeta} numberOfLines={1}>{item.owner_name}</Text>
              <View style={styles.rowFooter}>
                <Text style={styles.rowRating}>{directoryRatingText(item.average_rating, t('find.noRatings'))}</Text>
                {item.distance_km !== null && item.distance_km !== undefined ? (
                  <Text style={styles.rowPrice}>{formatDistanceKm(item.distance_km)}</Text>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  header: {
    paddingHorizontal: space[5],
    paddingTop: space[4],
    gap: space[3],
  },
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[3],
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: space[4],
    minHeight: 48,
  },
  filterButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderRadius: radii.md,
  },
  filterButtonActive: {
    backgroundColor: colors.primarySoft,
  },
  filterPanel: {
    gap: space[3],
    padding: space[3],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
  },
  filterTitle: { ...typography.label, color: colors.textMuted, textAlign: 'right' },
  ratingOptions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: space[2] },
  ratingOption: { minHeight: 40, flex: 1, minWidth: 88, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, paddingHorizontal: space[2] },
  ratingOptionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  ratingOptionText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  ratingOptionTextSelected: { color: colors.primary },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  nearbyStatus: {
    ...typography.caption,
    color: colors.primary,
    textAlign: 'right',
  },
  locationMessage: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'right',
  },

  segment: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space[2],
    borderRadius: radii.md,
  },
  segmentOn: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    ...typography.label,
    color: colors.textMuted,
  },
  segmentTextOn: {
    color: colors.primary,
  },
  list: {
    padding: space[5],
    gap: space[3],
    flexGrow: 1,
  },
  rowCard: {
    minHeight: 88,
    gap: space[1],
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: space[4],
  },
  rowCardPressed: { backgroundColor: colors.primarySoft },
  rowTitle: { ...typography.bodyStrong, width: '100%', textAlign: 'right' },
  rowMeta: { ...typography.caption, color: colors.textMuted, width: '100%', textAlign: 'right' },
  rowFooter: {
    width: '100%',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space[2],
    marginTop: space[1],
  },
  rowRating: { ...typography.caption, color: colors.accentText },
  rowPrice: { ...typography.caption, color: colors.textMuted, flexShrink: 1 },
});
