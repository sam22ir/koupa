import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CustomerStageHeader } from '@/src/components/ui/CustomerStageHeader';
import { Screen } from '@/src/components/ui/Screen';
import { ShopHub } from '@/src/features/barber-shop/ShopHub';
import { useShops } from '@/src/hooks/useShops';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors } from '@/src/theme';

export default function BarberShopScreen() {
  const router = useRouter();
  const { session } = useAppSession();
  const shops = useShops(session?.user.id);
  const push = (href: Href) => router.push(href);
  const subtitle = shops.ownedShop
    ? t('shopWorkspace.ownerSubtitle')
    : shops.relationship.kind === 'member'
      ? t('shopWorkspace.memberSubtitle')
      : shops.relationship.kind === 'request'
        ? t('shopWorkspace.pendingSubtitle')
        : shops.relationship.kind === 'invitation'
          ? t('shopWorkspace.invitationSubtitle')
          : t('shopWorkspace.unaffiliatedSubtitle');

  return (
    <Screen padded={false} style={styles.screen}>
      <CustomerStageHeader
        tone="paper"
        title={t('shopWorkspace.title')}
        subtitle={subtitle}
      />
      <View style={styles.surface}>
        <ShopHub
          shops={shops}
          onSearch={() => push('/shop-search')}
          onCreate={() => push('/shop-create')}
          onDetails={(shopId) => push(`/shop-details/${shopId}`)}
          onInvite={() => push('/shop-search?mode=invite')}
          onMember={(member) => push(`/shop-member/${member.barber_id}`)}
          onActivity={(shopId) => push(`/shop-activity/${shopId}`)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.workspace },
  surface: { flex: 1, backgroundColor: colors.workspace },
});
