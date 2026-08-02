import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import type { ShopSummary } from '@/src/shops';
import { Avatar, CustomerStageHeader, EmptyState, ErrorBanner, Icon, Screen } from '@/src/components/ui';
import { useBooking } from '@/src/hooks/useBooking';
import { useShops } from '@/src/hooks/useShops';
import { t } from '@/src/i18n';
import { SEARCH_PAGE_SIZE } from '@/src/services';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/fonts';
import { radii } from '@/src/theme/radii';
import { space } from '@/src/theme/spacing';
import { typography } from '@/src/theme/typography';
import { initialsFromName } from '@/src/utils/initials';

type Directory = 'barbers' | 'shops';

export default function FindScreen() {
  const { searchBarbers, loading: bookingLoading, error: bookingError } = useBooking();
  const { searchShops, loading: shopsLoading, error: shopsError } = useShops();
  const [directory, setDirectory] = useState<Directory>('barbers');
  const [query, setQuery] = useState('');
  const [barbers, setBarbers] = useState<readonly BarberSummary[]>([]);
  const [shops, setShops] = useState<readonly ShopSummary[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async (nextQuery: string, kind: Directory, nextPage = 0, append = false) => {
    setSearched(true);
    setLoadingMore(true);
    try {
      if (kind === 'barbers') {
        const items = (await searchBarbers(nextQuery, '', nextPage)) ?? [];
        setBarbers((prev) => (append ? [...prev, ...items] : items));
        setHasMore(items.length === SEARCH_PAGE_SIZE);
      } else {
        const items = (await searchShops(nextQuery, nextPage)) ?? [];
        setShops((prev) => (append ? [...prev, ...items] : items));
        setHasMore(items.length === SEARCH_PAGE_SIZE);
      }
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  }, [searchBarbers, searchShops]);

  useEffect(() => {
    void runSearch('', 'barbers');
  }, [runSearch]);

  const onSubmit = () => {
    void runSearch(query.trim(), directory, 0, false);
  };

  return (
    <Screen padded={false}>
      <CustomerStageHeader title={t('find.title')} subtitle={t('find.subtitle')} />
      <View style={styles.body}>
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Icon name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={onSubmit}
            placeholder={t('find.placeholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            textAlign="right"
            returnKeyType="search"
          />
          <Pressable onPress={onSubmit} accessibilityRole="button">
            <Icon name="arrow-back-circle" size={26} color={colors.primary} />
          </Pressable>
        </View>
        <View style={styles.segment}>
          {(['barbers', 'shops'] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => {
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
          data={[...barbers]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !bookingLoading && !loadingMore ? <EmptyState title={t('find.empty')} /> : null
          }
          ListFooterComponent={loadingMore || bookingLoading ? <ActivityIndicator color={colors.primary} /> : null}
          onEndReached={() => {
            if (hasMore && !loadingMore) void runSearch(query.trim(), 'barbers', page + 1, true);
          }}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/barber/${item.id}`)}>
              <Avatar initials={initialsFromName(item.name)} />
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowMeta}>
                  {[item.neighborhood, item.city].filter(Boolean).join('، ')}
                </Text>
                <Text style={styles.rowMeta}>
                  ★ {item.average_rating.toFixed(1)} · {t('find.fromPrice')} {item.starting_price_dzd} {t('common.dzd')}
                </Text>
              </View>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={[...shops]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !shopsLoading && !loadingMore ? <EmptyState title={t('find.empty')} /> : null
          }
          ListFooterComponent={loadingMore || shopsLoading ? <ActivityIndicator color={colors.primary} /> : null}
          onEndReached={() => {
            if (hasMore && !loadingMore) void runSearch(query.trim(), 'shops', page + 1, true);
          }}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/shop/${item.id}`)}>
              <Avatar initials={initialsFromName(item.name)} />
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowMeta}>{item.owner_name}</Text>
                <Text style={styles.rowMeta}>
                  ★ {(item.average_rating ?? 0).toFixed(1)}
                </Text>
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
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
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
  row: {
    flexDirection: 'row-reverse',
    gap: space[3],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: space[4],
    marginBottom: space[3],
  },
  rowCopy: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  rowTitle: {
    ...typography.bodyStrong,
  },
  rowMeta: {
    ...typography.caption,
  },
});
