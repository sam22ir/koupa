import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/src/components/ui/BrandLogo';
import { Screen } from '@/src/components/ui/Screen';
import { Stage } from '@/src/components/ui/Stage';
import { ShopHub } from '@/src/features/barber-shop/ShopHub';
import { useShops } from '@/src/hooks/useShops';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, radii, space, typography } from '@/src/theme';

export default function BarberShopScreen() {
  const router = useRouter();
  const { session } = useAppSession();
  const shops = useShops(session?.user.id);
  const push = (href: string) => router.push(href as never);
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
      <Stage decoration="subtle">
        <View style={styles.stageTopRow}>
          <View style={styles.logoWrap}>
            <BrandLogo variant="full" height={56} imageStyle={styles.logoImage} />
            <View style={styles.logoAccent} />
          </View>
        </View>
        <View style={styles.stageTitleBlock}>
          <Text style={styles.title}>{t('shopWorkspace.title')}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </Stage>
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
  stageTopRow: { minHeight: 58, position: 'relative' },
  logoWrap: { position: 'absolute', left: 0, top: 0, alignItems: 'center', gap: space[2] },
  logoImage: { tintColor: colors.onPrimary, opacity: 0.96 },
  logoAccent: { width: space[6], height: 3, borderRadius: radii.pill, backgroundColor: colors.accent },
  stageTitleBlock: { gap: space[1], alignItems: 'flex-end' },
  title: { ...typography.title, color: colors.onPrimary, textAlign: 'right' },
  subtitle: { ...typography.body, color: colors.onPrimaryMuted, textAlign: 'right' },
  surface: { flex: 1, marginTop: -space[5], backgroundColor: colors.workspace },
});
