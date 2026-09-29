import { useRouter, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/src/components/ui';
import { Screen } from '@/src/components/ui/Screen';
import { ShopHub } from '@/src/features/barber-shop/ShopHub';
import { useShops } from '@/src/hooks/useShops';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, layout, space, typography } from '@/src/theme';

export default function BarberShopScreen() {
  const router = useRouter();
  const { session, profile } = useAppSession();
  const shops = useShops(session?.user.id);
  const push = (href: Href) => router.push(href);

  // create_shop and request_join_shop both require a published profile, so say
  // so here rather than letting the barber hit a raw server error.
  if (profile && profile.role === 'barber' && !profile.is_published) {
    return (
      <Screen padded={false} style={styles.screen}>
        <View style={styles.surface}>
          <EmptyState
            title={t('barber.shopLockedTitle')}
            body={t('barber.shopLockedBody')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false} style={styles.screen}>
      <View style={styles.surface}>
        <Text accessibilityRole="header" style={styles.title}>{t('tabs.shop')}</Text>
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
  screen: { backgroundColor: colors.background },
  surface: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.title, textAlign: 'right', paddingHorizontal: layout.screenPaddingX, paddingTop: space[2] },
});
