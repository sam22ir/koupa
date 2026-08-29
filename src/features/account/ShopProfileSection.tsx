import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { ErrorBanner } from '@/src/components/ui/ErrorBanner';
import { ShopStateCard } from '@/src/features/barber-shop/ShopStateCard';
import { useShops } from '@/src/hooks/useShops';
import { t } from '@/src/i18n';
import type { ShopMembership, ShopRelationship } from '@/src/shops';
import { colors, layout, radii, space, typography } from '@/src/theme';

type ShopsFacade = ReturnType<typeof useShops>;

type Props = {
  readonly userId?: string | null;
};

function locationLabel(shop: { readonly city?: string | null; readonly neighborhood?: string | null } | null): string | null {
  if (!shop) return null;
  const value = [shop.neighborhood, shop.city].filter(Boolean).join('، ');
  return value || null;
}

function manageAction() {
  return {
    label: t('profile.manageShop'),
    onPress: () => router.push('/shop'),
  };
}

function isInitialState(shops: ShopsFacade): boolean {
  const state = shops.state;
  const relationship = shops.relationship ?? state.relationship;
  return !shops.ownedShop
    && !shops.membership
    && relationship.kind === 'none'
    && state.members.length === 0;
}

function ShopProfileContent({ shops }: { readonly shops: ShopsFacade }) {
  const state = shops.state;
  const relationship: ShopRelationship = shops.relationship ?? state.relationship;
  const owned = shops.ownedShop ?? state.ownedShop;
  const membership: ShopMembership | null = shops.membership ?? state.membership;

  if (isInitialState(shops) && shops.loading) {
    return (
      <View style={styles.statusState} accessibilityLabel={t('common.loading')}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.statusText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (isInitialState(shops) && shops.error) {
    return (
      <View style={styles.statusState}>
        <ErrorBanner error={shops.error} />
        <Button label={t('shopWorkspace.retry')} variant="secondary" onPress={() => void shops.retry()} />
      </View>
    );
  }

  if (owned) {
    return (
      <ShopStateCard
        kind="owner"
        title=""
        shopName={owned.name}
        shopLocation={locationLabel(owned)}
        metrics={[
          {
            label: t('shopWorkspace.memberCount'),
            value: state.members.filter((member) => member.status === 'active').length.toLocaleString('ar-DZ'),
          },
          {
            label: t('shopWorkspace.pendingCount'),
            value: state.pendingRequests.length.toLocaleString('ar-DZ'),
          },
          { label: t('shopWorkspace.status'), value: t('shopWorkspace.activeStatus') },
        ]}
        primaryAction={manageAction()}
      />
    );
  }

  if (relationship.kind === 'request' && membership) {
    return <ShopStateCard kind="request" membership={membership} shopName={membership.shop_name} primaryAction={manageAction()} />;
  }

  if (relationship.kind === 'invitation' && membership) {
    return <ShopStateCard kind="invitation" membership={membership} shopName={membership.shop_name} primaryAction={manageAction()} />;
  }

  if (relationship.kind === 'member' && membership) {
    return <ShopStateCard kind="member" membership={membership} shopName={membership.shop_name} primaryAction={manageAction()} />;
  }

  return <ShopStateCard kind="none" primaryAction={manageAction()} />;
}

export function ShopProfileSection({ userId }: Props) {
  const shops = useShops(userId ?? undefined);

  return (
    <View testID="profile-shop-section" style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('profile.shopSection')}</Text>
        <Text style={styles.sectionSubtitle}>{t('profile.shopSectionSubtitle')}</Text>
      </View>
      <ShopProfileContent shops={shops} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space[2],
  },
  sectionHeader: {
    gap: space[1],
    paddingHorizontal: space[1],
    alignItems: 'flex-end',
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    textAlign: 'right',
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'right',
  },
  statusState: {
    gap: space[3],
    alignItems: 'stretch',
    justifyContent: 'center',
    minHeight: 96,
    padding: layout.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
  },
  statusText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
