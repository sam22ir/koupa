import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { ErrorBanner } from '@/src/components/ui/ErrorBanner';
import { ShopMemberList } from '@/src/features/barber-shop/ShopMemberList';
import { ShopStateCard } from '@/src/features/barber-shop/ShopStateCard';
import { useShops } from '@/src/hooks/useShops';
import { t } from '@/src/i18n';
import { isInvitationExpired, type ShopMembership } from '@/src/shops';
import { colors, layout, space, typography } from '@/src/theme';

type ShopsFacade = ReturnType<typeof useShops>;

type Props = {
  readonly shops: ShopsFacade;
  readonly onSearch?: () => void;
  readonly onCreate?: () => void;
  readonly onDetails?: (shopId: string) => void;
  readonly onInvite?: () => void;
  readonly onMember?: (member: ShopMembership) => void;
  readonly onActivity?: (shopId: string) => void;
};

function locationLabel(shop: { readonly city?: string | null; readonly neighborhood?: string | null } | null): string | null {
  if (!shop) return null;
  const value = [shop.neighborhood, shop.city].filter(Boolean).join('، ');
  return value || null;
}

export function ShopHub({
  shops,
  onSearch,
  onCreate,
  onDetails,
  onInvite,
  onMember,
  onActivity,
}: Props) {
  const state = shops.state;
  const relationship = shops.relationship ?? state.relationship;
  const owned = shops.ownedShop ?? state.ownedShop;
  const membership = shops.membership ?? state.membership;
  const isInitialState = !owned && !membership && relationship.kind === 'none' && state.members.length === 0;

  if (isInitialState && shops.loading) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <View style={styles.statusState} accessibilityLabel={t('common.loading')}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.statusText}>{t('common.loading')}</Text>
        </View>
      </ScrollView>
    );
  }

  if (isInitialState && shops.error) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <ErrorBanner error={shops.error} />
        <Button label={t('shopWorkspace.retry')} variant="secondary" onPress={() => void shops.retry()} />
      </ScrollView>
    );
  }

  if (owned) {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <ErrorBanner error={shops.error || null} />
        {shops.message ? <Text style={styles.message}>{t(`shopWorkspace.${shops.message}`)}</Text> : null}
        <ShopStateCard
          kind="owner"
          title={t('shopWorkspace.shopSummary')}
          shopName={owned.name}
          shopLocation={locationLabel(owned)}
          metrics={[
            { label: t('shopWorkspace.memberCount'), value: state.members.filter((member) => member.status === 'active').length.toLocaleString('ar-DZ') },
            { label: t('shopWorkspace.pendingCount'), value: state.pendingRequests.length.toLocaleString('ar-DZ') },
            { label: t('shopWorkspace.status'), value: t('shopWorkspace.activeStatus') },
          ]}
        />
        <ShopMemberList
          members={state.members.filter((member) => member.status === 'active')}
          pendingRequests={state.pendingRequests}
          onMemberPress={onMember}
          onRequestAccept={(request) => void shops.respond(request.id, true)}
          onRequestReject={(request) => void shops.respond(request.id, false)}
          onInvite={onInvite}
          inviteLoading={shops.saving}
          showMembershipActivity
          saving={shops.saving}
        />
        {onActivity ? (
          <Button
            label={t('shopWorkspace.activity')}
            variant="ghost"
            onPress={() => onActivity(owned.id)}
          />
        ) : null}
        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>{t('shopWorkspace.deleteShop')}</Text>
          <Text style={styles.dangerBody}>{t('shopWorkspace.deleteConfirmBody')}</Text>
          <Button
            label={t('shopWorkspace.deleteShop')}
            variant="danger"
            loading={shops.saving}
            onPress={() =>
              Alert.alert(t('shopWorkspace.deleteConfirmTitle'), t('shopWorkspace.deleteConfirmBody'), [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('shopWorkspace.deleteShop'), style: 'destructive', onPress: () => void shops.removeShop() },
              ])
            }
          />
        </View>
      </ScrollView>
    );
  }

  if (relationship.kind === 'request' && membership) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <ErrorBanner error={shops.error || null} />
        <ShopStateCard
          kind="request"
          membership={membership}
          shopName={membership.shop_name}
          primaryAction={onDetails ? { label: t('shopWorkspace.details'), onPress: () => onDetails(membership.shop_id) } : undefined}
        />
      </ScrollView>
    );
  }

  if (relationship.kind === 'invitation' && membership) {
    const expired = isInvitationExpired(membership);
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <ErrorBanner error={shops.error || null} />
        <ShopStateCard
          kind="invitation"
          membership={membership}
          shopName={membership.shop_name}
          body={expired ? t('shopWorkspace.invitationExpired') : undefined}
          primaryAction={expired ? undefined : {
            label: t('shopWorkspace.accept'),
            onPress: () => void shops.respondInvitation(membership.id, true),
            loading: shops.saving,
          }}
          secondaryAction={expired ? undefined : {
            label: t('shopWorkspace.reject'),
            onPress: () => void shops.respondInvitation(membership.id, false),
            disabled: shops.saving,
          }}
        />
      </ScrollView>
    );
  }

  if (relationship.kind === 'member' && membership) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <ErrorBanner error={shops.error || null} />
        <ShopStateCard
          kind="member"
          membership={membership}
          shopName={membership.shop_name}
          primaryAction={onDetails ? { label: t('shopWorkspace.details'), onPress: () => onDetails(membership.shop_id) } : undefined}
          secondaryAction={{
            label: t('shopWorkspace.leave'),
            onPress: () => Alert.alert(t('shopWorkspace.leaveConfirmTitle'), t('shopWorkspace.leaveConfirmBody'), [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('shopWorkspace.leave'), style: 'destructive', onPress: () => void shops.leave() },
            ]),
            disabled: shops.saving,
          }}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <ErrorBanner error={shops.error || null} />
      {shops.error ? (
        <Button label={t('shopWorkspace.retry')} variant="secondary" onPress={() => void shops.retry()} />
      ) : null}
      <ShopStateCard
        kind="none"
        primaryAction={onSearch ? { label: t('shopWorkspace.search'), onPress: onSearch } : undefined}
        secondaryAction={onCreate ? { label: t('shopWorkspace.create'), onPress: onCreate } : undefined}
      />
      <View style={styles.steps}>
        <Text style={styles.stepsTitle}>{t('shopWorkspace.searchHint')}</Text>
        <Text style={styles.step}>١. ابحث عن محل قريب منك</Text>
        <Text style={styles.step}>٢. راجع التفاصيل وأرسل طلبك</Text>
        <Text style={styles.step}>٣. انتظر موافقة المالك</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.workspace },
  content: { gap: space[4], paddingHorizontal: layout.screenPaddingX, paddingVertical: space[4], paddingBottom: space[10] },
  statusState: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: space[3] },
  statusText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  message: { ...typography.caption, color: colors.primary, textAlign: 'right' },
  steps: { gap: space[2], padding: layout.cardPadding, borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: colors.surface },
  stepsTitle: { ...typography.bodyStrong, textAlign: 'right' },
  step: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  dangerSection: { gap: space[2], paddingTop: space[5], borderTopWidth: 1, borderTopColor: colors.border },
  dangerTitle: { ...typography.bodyStrong, color: colors.danger, textAlign: 'right' },
  dangerBody: { ...typography.caption, color: colors.textMuted, textAlign: 'right', lineHeight: 22 },
});
