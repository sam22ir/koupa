import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { BarberSummary, MapBarber } from '@/src/booking';
import { ALGIERS_CENTER, type GeoPoint } from '@/src/location';
import type { ShopSummary } from '@/src/shops';
import { Button, EmptyState, ErrorBanner, Icon, Screen, Stage } from '@/src/components/ui';
import { BarbersMap, type MapFocusRequest } from '@/src/features/customer-find/BarbersMap';
import { boundsMovedEnough, toMarkers, type MapBounds } from '@/src/features/customer-find/barbersMap';
import { DirectoryCard } from '@/src/features/customer-find/DirectoryCard';
import { useBooking } from '@/src/hooks/useBooking';
import { useDeviceLocation } from '@/src/hooks/useDeviceLocation';
import { useShops } from '@/src/hooks/useShops';
import { useAppSession } from '@/src/providers/SessionProvider';
import { t } from '@/src/i18n';
import { consumeCustomerFindCityPreference } from '@/src/navigation/customerFindPreference';
import { SEARCH_PAGE_SIZE } from '@/src/services';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/fonts';
import { elevation } from '@/src/theme/elevation';
import { radii } from '@/src/theme/radii';
import { layout, space } from '@/src/theme/spacing';
import { typography } from '@/src/theme/typography';

type Directory = 'barbers' | 'shops';

export default function FindScreen() {
  // Guests browse the barber directory only; shop RPCs stay signed-in.
  const { guestBrowsing } = useAppSession();
  const {
    searchBarbers,
    searchNearbyBarbers,
    searchBarbersInBounds,
    loading: bookingLoading,
    error: bookingError,
  } = useBooking();
  const { searchShops, searchNearbyShops, loading: shopsLoading, error: shopsError } = useShops();
  const { request: requestLocation, status: locationStatus } = useDeviceLocation();
  const [directory, setDirectory] = useState<Directory>('barbers');
  const [query, setQuery] = useState('');
  // Distance is only present on nearest-first results.
  const [barbers, setBarbers] = useState<readonly (BarberSummary & { readonly distance_km?: number })[]>([]);
  const [shops, setShops] = useState<readonly ShopSummary[]>([]);
  const [nearbyOrigin, setNearbyOrigin] = useState<GeoPoint | null>(null);
  const [locationMessage, setLocationMessage] = useState('');
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
  ): Promise<number | null> => {
    const requestId = ++searchRequestRef.current;
    setSearched(true);
    setLoadingMore(true);
    try {
      let found: number | null = null;
      if (kind === 'barbers') {
        const result = origin
          ? await searchNearbyBarbers(origin.latitude, origin.longitude, nextQuery, nextPage)
          : await searchBarbers(nextQuery, city, nextPage);
        if (requestId !== searchRequestRef.current) return null;
        if (result == null) {
          if (!append) {
            setBarbers([]);
            setHasMore(false);
          }
          return null;
        }
        const items = result;
        setBarbers((prev) => (append ? [...prev, ...items] : items));
        setHasMore(items.length === SEARCH_PAGE_SIZE);
        found = items.length;
      } else {
        const result = origin
          ? await searchNearbyShops(origin.latitude, origin.longitude, nextQuery, nextPage)
          : await searchShops(nextQuery, nextPage);
        if (requestId !== searchRequestRef.current) return null;
        if (result == null) {
          if (!append) {
            setShops([]);
            setHasMore(false);
          }
          return null;
        }
        const items = result;
        setShops((prev) => (append ? [...prev, ...items] : items));
        setHasMore(items.length === SEARCH_PAGE_SIZE);
        found = items.length;
      }
      setPage(nextPage);
      return found;
    } finally {
      if (requestId === searchRequestRef.current) setLoadingMore(false);
    }
  }, [nearbyOrigin, searchBarbers, searchNearbyBarbers, searchNearbyShops, searchShops]);

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
        const found = await runSearch(preferredCity, 'barbers', 0, false, null, preferredCity);
        // One-shot preference: do not keep city locked for later searches.
        cityFilterRef.current = '';
        // A saved city with no published barbers must not look like an empty
        // directory. Fall back to the full list and say why.
        if (found === 0) {
          setQuery('');
          setLocationMessage(t('find.broadenedCity'));
          await runSearch('', 'barbers', 0, false, null, '');
        }
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

  // Map view (barbers only, phone app only).
  const [mapMode, setMapMode] = useState(false);
  const [mapBarbers, setMapBarbers] = useState<readonly MapBarber[]>([]);
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);
  const [mapFocus, setMapFocus] = useState<MapFocusRequest | null>(null);
  const [areaDirty, setAreaDirty] = useState(false);
  const [areaSearched, setAreaSearched] = useState(false);
  const latestBounds = useRef<MapBounds | null>(null);
  const searchedBounds = useRef<MapBounds | null>(null);
  const showMap = mapMode && directory === 'barbers' && Platform.OS !== 'web';

  const searchArea = useCallback(async (bounds: MapBounds) => {
    searchedBounds.current = bounds;
    setAreaDirty(false);
    const result = await searchBarbersInBounds(bounds, query.trim());
    if (result == null) return;
    setMapBarbers(result);
    setAreaSearched(true);
    setMapSelectedId((current) => (result.some((item) => item.id === current) ? current : null));
  }, [query, searchBarbersInBounds]);

  const onMapBounds = useCallback((bounds: MapBounds) => {
    latestBounds.current = bounds;
    // The first viewport searches itself; after that the customer asks for it.
    if (!searchedBounds.current) void searchArea(bounds);
    else setAreaDirty(boundsMovedEnough(searchedBounds.current, bounds));
  }, [searchArea]);

  const centerMapOnMe = async () => {
    setLocationMessage('');
    const origin = await requestLocation();
    if (!origin) {
      setLocationMessage(t('find.nearMeUnavailable'));
      return;
    }
    setMapFocus({ latitude: origin.latitude, longitude: origin.longitude, nonce: Date.now() });
  };

  const mapSelected = mapBarbers.find((item) => item.id === mapSelectedId) ?? null;

  const toggleNearbySearch = async () => {
    clearSearchTimer();
    setLocationMessage('');
    if (nearbyOrigin) {
      setNearbyOrigin(null);
      void runSearch(query.trim(), directory, 0, false, null);
      return;
    }

    const origin = await requestLocation();
    if (!origin) {
      setLocationMessage(t('find.nearMeUnavailable'));
      return;
    }
    setNearbyOrigin(origin);
    // Nearest-first applies to the list the customer is already looking at.
    const found = await runSearch(query.trim(), directory, 0, false, origin);
    // Nothing inside the 25 km radius is common outside big cities. Widen to
    // everything rather than leaving the customer on an empty list.
    if (found === 0) {
      setNearbyOrigin(null);
      setLocationMessage(t('find.broadenedRadius'));
      await runSearch(query.trim(), directory, 0, false, null);
    }
  };

  return (
    <Screen padded={false} bleedTop>
      <View style={styles.body}>
      <Stage overlap>
        <Text accessibilityRole="header" style={styles.title}>{t('find.title')}</Text>
        <View style={styles.searchBox}>
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
            <Icon name={query.trim() ? 'arrow-back-circle' : 'search-outline'} size={22} color={query.trim() ? colors.primary : colors.textMuted} />
          </Pressable>
          <TextInput
            accessibilityLabel={t('find.placeholder')}
            value={query}
            onChangeText={(nextQuery) => {
              setQuery(nextQuery);
              // A new search text means the pins on screen are out of date.
              if (showMap && searchedBounds.current) setAreaDirty(true);
              scheduleSearch(nextQuery);
            }}
            onSubmitEditing={onSubmit}
            placeholder={t('find.placeholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            textAlign="right"
            returnKeyType="search"
          />
        </View>
      </Stage>
      <View style={styles.controls}>
        {guestBrowsing ? null : (
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
        )}
        <View style={styles.chips}>
          {showMap ? null : (
            <FilterChip
              testID="find-near-me"
              icon="navigate-outline"
              label={nearbyOrigin ? t('find.nearMeActive') : t('find.nearMe')}
              selected={Boolean(nearbyOrigin)}
              busy={locationStatus === 'requesting'}
              onPress={() => void toggleNearbySearch()}
            />
          )}
          {directory === 'barbers' && Platform.OS !== 'web' ? (
            <FilterChip
              testID="find-map-toggle"
              icon={mapMode ? 'list-outline' : 'map-outline'}
              label={mapMode ? t('find.showList') : t('find.showMap')}
              selected={mapMode}
              onPress={() => {
                // A reopened map starts fresh and searches its first viewport itself.
                searchedBounds.current = null;
                setAreaDirty(false);
                setAreaSearched(false);
                setMapMode((open) => !open);
              }}
            />
          ) : null}
          {[
            { value: 4, label: t('find.rating4') },
            { value: 4.5, label: t('find.rating45') },
          ].map((option) => (
            <FilterChip
              key={option.value}
              icon="star-outline"
              label={option.label}
              selected={minimumRating === option.value}
              onPress={() => setMinimumRating(minimumRating === option.value ? 0 : option.value)}
            />
          ))}
        </View>
        {nearbyOrigin ? <Text style={styles.nearbyStatus}>{t('find.nearMeResults')}</Text> : null}
        {locationMessage ? <Text style={styles.locationMessage}>{locationMessage}</Text> : null}
        <ErrorBanner error={searched ? (directory === 'barbers' ? bookingError : shopsError) : ''} />
      </View>

      {showMap ? (
        <View style={styles.mapSection} testID="find-map-section">
          <BarbersMap
            center={nearbyOrigin ?? ALGIERS_CENTER}
            markers={toMarkers(mapBarbers)}
            selectedId={mapSelectedId}
            focus={mapFocus}
            onSelect={setMapSelectedId}
            onBoundsChange={onMapBounds}
          />
          <View style={styles.mapActions}>
            {areaDirty ? (
              <Button
                testID="find-search-area"
                label={t('find.searchThisArea')}
                loading={bookingLoading}
                onPress={() => latestBounds.current && void searchArea(latestBounds.current)}
                style={styles.mapActionButton}
              />
            ) : null}
            <Button
              testID="find-map-locate"
              label={t('find.myLocation')}
              variant="secondary"
              loading={locationStatus === 'requesting'}
              onPress={() => void centerMapOnMe()}
              style={styles.mapActionButton}
            />
          </View>
          {areaSearched && !bookingLoading && mapBarbers.length === 0 ? (
            <Text style={styles.locationMessage}>{t('find.mapEmpty')}</Text>
          ) : null}
          {mapSelected ? (
            <DirectoryCard
              testID="find-map-card"
              title={mapSelected.name}
              meta={[mapSelected.neighborhood, mapSelected.city].filter(Boolean).join('، ')}
              average={mapSelected.average_rating}
              startingPrice={mapSelected.starting_price_dzd}
              onPress={() => router.push({ pathname: '/barber/[id]', params: { id: mapSelected.id, returnTo: '/find' } })}
            />
          ) : null}
        </View>
      ) : directory === 'barbers' ? (
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
            <DirectoryCard
              title={item.name}
              meta={[item.neighborhood, item.city].filter(Boolean).join('، ')}
              average={item.average_rating}
              distanceKm={item.distance_km}
              startingPrice={item.starting_price_dzd}
              onPress={() => router.push({ pathname: '/barber/[id]', params: { id: item.id, returnTo: '/find' } })}
            />
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
            <DirectoryCard
              title={item.name}
              meta={[item.neighborhood, item.city].filter(Boolean).join('، ') || item.owner_name}
              average={item.average_rating}
              distanceKm={item.distance_km}
              onPress={() => router.push({ pathname: '/shop/[id]', params: { id: item.id, returnTo: '/find' } })}
            />
          )}
        />
      )}
      </View>
    </Screen>
  );
}

function FilterChip({ label, icon, selected, busy, onPress, testID }: {
  readonly label: string;
  readonly icon: 'navigate-outline' | 'map-outline' | 'list-outline' | 'star-outline';
  readonly selected: boolean;
  readonly busy?: boolean;
  readonly onPress: () => void;
  readonly testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, busy: Boolean(busy) }}
      disabled={busy}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Icon name={icon} size={16} color={selected ? colors.onPrimary : colors.primary} />
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mapSection: { flex: 1, gap: space[3], paddingHorizontal: space[5], paddingBottom: space[4] },
  mapActions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: space[2] },
  mapActionButton: { flexGrow: 1, flexBasis: '45%' },
  body: { flex: 1 },
  title: { ...typography.title, color: colors.onPrimary, textAlign: 'right' },
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[3],
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: space[4],
    minHeight: 52,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  controls: {
    marginTop: layout.stageBodyOverlap + space[5],
    paddingHorizontal: space[5],
    gap: space[3],
  },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: space[2] },
  chip: {
    minHeight: 40,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[1],
    paddingHorizontal: space[4],
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.chip, color: colors.text },
  chipTextSelected: { color: colors.onPrimary },
  nearbyStatus: { ...typography.caption, color: colors.primary, textAlign: 'right' },
  locationMessage: { ...typography.caption, color: colors.danger, textAlign: 'right' },
  segment: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    padding: 4,
    ...elevation.float,
  },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: space[2], borderRadius: radii.pill },
  segmentOn: { backgroundColor: colors.primarySoft },
  segmentText: { ...typography.label, color: colors.textMuted },
  segmentTextOn: { color: colors.primarySoftText },
  list: { padding: space[5], gap: space[3], flexGrow: 1 },
});
