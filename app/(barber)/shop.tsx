import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/src/components/atoms/PrimaryButton';
import { BarberNavigation } from '@/src/components/molecules/BarberNavigation';
import { FormField } from '@/src/components/molecules/FormField';
import { Screen } from '@/src/components/organisms/Screen';
import { copy } from '@/src/data/copy';
import { useSession } from '@/src/hooks/useSession';
import { useShops } from '@/src/hooks/useShops';
import { membershipStatusLabel, type ShopDraft, type ShopSummary } from '@/src/shops';
import { colors, radii, spacing, typography } from '@/src/theme';

export default function BarberShop() {
  const { session } = useSession();
  const { state, loading, saving, error, message, createShop, requestJoin, respond, leave, removeShop, searchShops } = useShops(session?.user.id);
  const [draft, setDraft] = useState<ShopDraft>({ name: '', bio: '', mapsUrl: '', latitude: '', longitude: '' });
  const [joinQuery, setJoinQuery] = useState('');
  const [joinResults, setJoinResults] = useState<readonly ShopSummary[]>([]);

  const errorText =
    error === 'locationRequired'
      ? copy.common.locationRequired
      : error === 'validation'
        ? copy.common.validation
        : error
          ? copy.auth.failed
          : '';

  const searchJoin = async () => {
    const results = await searchShops(joinQuery);
    if (results) setJoinResults(results);
  };

  const confirmLeave = () => {
    Alert.alert(copy.barber.shopLeave, copy.barber.shopLeaveConfirm, [
      { text: copy.barber.shopCancelAction, style: 'cancel' },
      { text: copy.barber.shopConfirmAction, style: 'destructive', onPress: () => void leave() },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert(copy.barber.shopDelete, copy.barber.shopDeleteConfirm, [
      { text: copy.barber.shopCancelAction, style: 'cancel' },
      { text: copy.barber.shopConfirmAction, style: 'destructive', onPress: () => void removeShop() },
    ]);
  };

  return (
    <Screen footer={<BarberNavigation active="المحل" />}>
      <Text style={styles.title}>{copy.barber.shopTitle}</Text>
      {loading ? <Text style={styles.muted}>{copy.barber.loading}</Text> : null}
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
      {message === 'created' ? <Text style={styles.success}>{copy.barber.shopCreated}</Text> : null}
      {message === 'requested' ? <Text style={styles.success}>{copy.barber.shopRequested}</Text> : null}

      {state.ownedShop ? (
        <View style={styles.card}>
          <Text style={styles.heading}>{copy.barber.shopOwnerLabel}</Text>
          <Text style={styles.name}>{state.ownedShop.name}</Text>
          {state.ownedShop.bio ? <Text style={styles.meta}>{state.ownedShop.bio}</Text> : null}
          {state.ownedShop.maps_url ? (
            <Text selectable style={styles.meta}>
              {state.ownedShop.maps_url}
            </Text>
          ) : null}
          <Text style={styles.sectionTitle}>{copy.barber.shopPendingRequests}</Text>
          {!state.pendingRequests.length ? <Text style={styles.meta}>لا توجد طلبات حالياً.</Text> : null}
          {state.pendingRequests.map((request) => (
            <View key={request.id} style={styles.requestRow}>
              <Text style={styles.meta}>{request.barber_name ?? request.barber_id}</Text>
              <View style={styles.requestActions}>
                <Pressable accessibilityRole="button" onPress={() => void respond(request.id, true)}>
                  <Text style={styles.accept}>{copy.barber.shopAccept}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => void respond(request.id, false)}>
                  <Text style={styles.reject}>{copy.barber.shopReject}</Text>
                </Pressable>
              </View>
            </View>
          ))}
          <PrimaryButton label={copy.barber.shopDelete} variant="outline" loading={saving} onPress={confirmDelete} />
        </View>
      ) : null}

      {state.membership ? (
        <View style={styles.card}>
          <Text style={styles.heading}>{state.membership.status === 'active' ? copy.barber.shopMember : copy.barber.shopPending}</Text>
          <Text style={styles.name}>{state.membership.shop_name ?? state.membership.shop_id}</Text>
          <Text style={styles.meta}>{membershipStatusLabel(state.membership.status)}</Text>
          <PrimaryButton label={copy.barber.shopLeave} variant="outline" loading={saving} onPress={confirmLeave} />
        </View>
      ) : null}

      {!state.ownedShop && !state.membership ? (
        <>
          <Text style={styles.meta}>{copy.barber.shopNone}</Text>
          <View style={styles.card}>
            <Text style={styles.heading}>{copy.barber.shopCreateTitle}</Text>
            <FormField label={copy.barber.shopName} value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} />
            <FormField label={copy.barber.shopBio} value={draft.bio} onChangeText={(bio) => setDraft({ ...draft, bio })} multiline />
            <FormField label={copy.barber.shopMapsUrl} value={draft.mapsUrl} onChangeText={(mapsUrl) => setDraft({ ...draft, mapsUrl })} keyboardType="url" />
            <FormField label={copy.barber.shopLatitude} value={draft.latitude} onChangeText={(latitude) => setDraft({ ...draft, latitude })} keyboardType="numeric" />
            <FormField label={copy.barber.shopLongitude} value={draft.longitude} onChangeText={(longitude) => setDraft({ ...draft, longitude })} keyboardType="numeric" />
            <PrimaryButton label={copy.barber.shopCreate} loading={saving} onPress={() => void createShop(draft)} />
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>{copy.barber.shopJoinSearch}</Text>
            <FormField label={copy.customer.findShopsTab} value={joinQuery} onChangeText={setJoinQuery} />
            <PrimaryButton label="بحث" variant="outline" onPress={() => void searchJoin()} />
            {joinResults.map((shop) => (
              <View key={shop.id} style={styles.requestRow}>
                <View style={styles.joinText}>
                  <Text style={styles.name}>{shop.name}</Text>
                  <Text style={styles.meta}>{shop.owner_name}</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => void requestJoin(shop.id)}>
                  <Text style={styles.accept}>{copy.barber.shopJoin}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title, textAlign: 'right' },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heading: { color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body, textAlign: 'right' },
  sectionTitle: { color: colors.charcoal, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.label, textAlign: 'right' },
  name: { color: colors.charcoal, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.label, textAlign: 'right' },
  meta: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, textAlign: 'right' },
  requestRow: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: spacing.sm },
  requestActions: { flexDirection: 'row-reverse', gap: spacing.lg },
  joinText: { flex: 1, gap: spacing.xs },
  accept: { color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body, textAlign: 'right' },
  reject: { color: colors.danger, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body, textAlign: 'right' },
  muted: { color: colors.muted, fontFamily: typography.fontFamily.regular, textAlign: 'center' },
  error: { color: colors.danger, fontFamily: typography.fontFamily.regular, textAlign: 'right' },
  success: { color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body, textAlign: 'right' },
});
