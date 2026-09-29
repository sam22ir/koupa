import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { BackButton } from '@/src/components/ui/BackButton';
import { CustomerStageHeader } from '@/src/components/ui/CustomerStageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ErrorBanner } from '@/src/components/ui/ErrorBanner';
import { Field } from '@/src/components/ui/Field';
import { Screen } from '@/src/components/ui/Screen';
import { ShopSearchResult } from '@/src/features/barber-shop/ShopSearchResult';
import { useShops } from '@/src/hooks/useShops';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import type { ShopBarberCandidate } from '@/src/shops';
import { colors, elevation, layout, radii, space, typography } from '@/src/theme';
import { goBackFromShopScreen } from '@/src/navigation/barberShopNavigation';

export default function ShopSearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const inviteMode = mode === 'invite';
  const { session } = useAppSession();
  const shops = useShops(session?.user.id);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly import('@/src/shops').ShopSummary[]>([]);
  const [candidates, setCandidates] = useState<readonly ShopBarberCandidate[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');

  const runSearch = async () => {
    setSearching(true);
    setSearched(true);
    setInviteMessage('');
    if (inviteMode) {
      setCandidates((await shops.searchBarbers(query.trim())) ?? []);
    } else {
      setResults((await shops.searchShops(query.trim())) ?? []);
    }
    setSearching(false);
  };

  const invite = async (barberId: string) => {
    const ok = await shops.inviteBarber(barberId);
    if (ok) setInviteMessage(t('shopWorkspace.invitationSent'));
  };

  return (
    <Screen scroll padded={false}>
      <CustomerStageHeader
        title={inviteMode ? t('shopWorkspace.invite') : t('shopWorkspace.search')}
        context={t('auth.roleBarber')}
        trailing={<BackButton fallback="/(barber)/shop" onPress={goBackFromShopScreen} />}
      />
      <View style={styles.body}>
      <Field
        label={inviteMode ? t('shopWorkspace.barberSearchLabel') : t('shopWorkspace.shopSearchLabel')}
        value={query}
        onChangeText={setQuery}
        placeholder={inviteMode ? t('shopWorkspace.barberSearchPlaceholder') : t('shopWorkspace.shopSearchPlaceholder')}
        returnKeyType="search"
        onSubmitEditing={() => void runSearch()}
      />
      <Button label={t('common.search')} onPress={() => void runSearch()} loading={searching} />
      <ErrorBanner error={searched ? shops.error || null : null} />
      {searched && shops.error && !shops.ownedShop ? (
        <Button
          label={t('common.retry')}
          variant="secondary"
          onPress={() => void shops.retry()}
          loading={shops.loading}
        />
      ) : null}
      {inviteMessage ? <Text style={styles.success}>{inviteMessage}</Text> : null}

      {inviteMode ? (
        searched && !candidates.length ? (
          <EmptyState title={t('find.empty')} body={t('shopWorkspace.tryDifferentSearch')} />
        ) : (
          <View style={styles.list}>
            {candidates.map((candidate) => (
              <View key={candidate.id} style={styles.candidate}>
                <View style={styles.candidateCopy}>
                  <Text style={styles.name}>{candidate.name}</Text>
                  <Text style={styles.meta}>{[candidate.neighborhood, candidate.city].filter(Boolean).join('، ')}</Text>
                </View>
                <Button
                  label={t('shopWorkspace.invite')}
                  variant="secondary"
                  onPress={() => void invite(candidate.id)}
                  loading={shops.saving}
                  disabled={shops.loading || !shops.ownedShop}
                />
              </View>
            ))}
          </View>
        )
      ) : searched && !results.length ? (
        <EmptyState title={t('shopWorkspace.noSearchResults')} body={t('shopWorkspace.tryDifferentSearch')} />
      ) : (
        <View style={styles.list}>
          {results.map((shop) => (
            <ShopSearchResult
              key={shop.id}
              shop={shop}
              onPress={() => router.push(`/shop-details/${shop.id}`)}
            />
          ))}
        </View>
      )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[4], paddingHorizontal: layout.screenPaddingX, paddingBottom: space[8] },
  list: { gap: space[3] },
  candidate: { minHeight: 72, flexDirection: 'row-reverse', alignItems: 'center', gap: space[3], borderRadius: radii.lg, backgroundColor: colors.surface, padding: space[3], ...elevation.card },
  candidateCopy: { flex: 1, alignItems: 'flex-end', gap: space[1] },
  name: { ...typography.bodyStrong, textAlign: 'right' },
  meta: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  success: { ...typography.label, color: colors.success, textAlign: 'right' },
});
