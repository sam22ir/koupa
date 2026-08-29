import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { BarberProfile, BarberService } from '@/src/booking';
import { BackButton, Button, Card, Chip, CustomerStageHeader, EmptyState, ErrorBanner, Icon, Screen } from '@/src/components/ui';
import { useBooking } from '@/src/hooks/useBooking';
import { useAppSession } from '@/src/providers/SessionProvider';
import { t } from '@/src/i18n';
import { publicProfileReturnHref } from '@/src/navigation/bookingNavigation';
import { setPendingIntentFromPath } from '@/src/navigation/pendingIntent';
import { colors, layout, radii, space, typography } from '@/src/theme';

export default function BarberProfilePublicScreen() {
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const { getBarber, loading, error } = useBooking();
  const { profile } = useAppSession();
  const [barber, setBarber] = useState<BarberProfile | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const fallback = publicProfileReturnHref(returnTo, profile?.role);

  const load = useCallback(async () => {
    if (!id) return;
    const rows = await getBarber(id);
    setBarber(rows?.[0] ?? null);
    setSelectedServiceId(null);
  }, [getBarber, id]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
    // Reload only when the route id changes; hook identity churn must not
    // restart the load and clear the visitor's in-progress service selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const startBooking = (barberId: string, serviceId: string) => {
    const returnPath = `/barber/${barberId}`;
    if (profile?.role === 'customer') {
      router.push({
        pathname: '/book/[barberId]',
        params: { barberId, serviceId, returnTo: returnPath },
      });
      return;
    }
    if (profile?.role !== 'barber') {
      setPendingIntentFromPath(`/book/${barberId}`, { serviceId, returnTo: returnPath });
      router.push('/(auth)/sign-in');
    }
  };

  const selectedService = barber?.services.find((service) => service.id === selectedServiceId) ?? null;
  const canBook = profile?.role !== 'barber' && Boolean(selectedService);

  return (
    <Screen padded={false} scroll>
      <CustomerStageHeader
        title={t('find.barberProfileTitle')}
        subtitle={t('find.barberProfileSubtitle')}
        trailing={<BackButton fallback={fallback} />}
      />
      <View style={styles.body}>
        {loading && !barber ? <BarberProfileSkeleton /> : null}
        {error && barber ? <ErrorBanner error={error} /> : null}
        {barber ? (
          <>
            <Card style={styles.identityCard}>
              <Text style={styles.identityName}>{barber.name}</Text>
              <Text style={styles.identityLocation}>{[barber.neighborhood, barber.city].filter(Boolean).join('، ')}</Text>
              <Text style={styles.rating}>
                {barber.rating_count ? `★ ${barber.average_rating.toFixed(1)} (${barber.rating_count})` : t('find.noRatings')}
              </Text>
              {barber.bio ? <Text style={styles.bio}>{barber.bio}</Text> : null}
              <Text style={styles.phone}>{t('find.phoneLabel')}: {barber.phone}</Text>
              {barber.maps_url ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('find.openLocation')}
                  onPress={() => void Linking.openURL(barber.maps_url!).catch(() => undefined)}
                  style={({ pressed }) => [styles.outlineAction, pressed && styles.outlineActionPressed]}
                >
                  <Icon name="location-outline" size={18} color={colors.primary} />
                  <Text style={styles.outlineActionText}>{t('find.openLocation')}</Text>
                </Pressable>
              ) : null}
            </Card>

            <Text style={styles.section}>{t('booking.services')}</Text>
            {barber.services.length ? barber.services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                selected={selectedServiceId === service.id}
                onSelect={() => setSelectedServiceId(service.id)}
              />
            )) : <EmptyState title={t('booking.noServicesAvailable')} />}

            {barber.shop ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${barber.shop.name}، ${t('find.viewShop')}`}
                onPress={() => router.push({ pathname: '/shop/[id]', params: { id: barber.shop!.id, returnTo: `/barber/${barber.id}` } })}
                style={({ pressed }) => [styles.shopCard, pressed && styles.shopCardPressed]}
              >
                <View style={styles.shopHeader}>
                  <View style={styles.shopCopy}>
                    <Text style={styles.shopName}>{barber.shop.name}</Text>
                    <Text style={styles.shopLocation}>{[barber.shop.neighborhood, barber.shop.city].filter(Boolean).join('، ')}</Text>
                  </View>
                  <Icon name="chevron-back" size={18} color={colors.primary} />
                </View>
                <View style={styles.shopFooter}>
                  <Text style={styles.rating}>★ {barber.shop.average_rating.toFixed(1)} ({barber.shop.rating_count})</Text>
                  <Text style={styles.shopAction}>{t('find.viewShop')}</Text>
                </View>
              </Pressable>
            ) : null}

            {profile?.role !== 'barber' && barber.services.length ? (
              <Button
                label={t('booking.book')}
                disabled={!canBook}
                onPress={() => {
                  if (selectedService) startBooking(barber.id, selectedService.id);
                }}
              />
            ) : null}
          </>
        ) : !loading ? (
          <View style={styles.errorCard}>
            <ErrorBanner error={error || new Error(t('find.empty'))} />
            {error ? <Button label={t('common.retry')} variant="secondary" onPress={() => void load()} /> : null}
            <Button label={t('common.back')} variant="ghost" onPress={() => router.dismissTo(fallback)} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function ServiceCard({ service, selected, onSelect }: { readonly service: BarberService; readonly selected: boolean; readonly onSelect: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={service.name}
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={({ pressed }) => [styles.serviceCard, selected && styles.serviceCardSelected, pressed && styles.serviceCardPressed]}
    >
      <View style={styles.serviceTop}>
        <Text style={styles.serviceName}>{service.name}</Text>
        {selected ? <Icon name="checkmark-circle" size={20} color={colors.primary} /> : null}
      </View>
      <View style={styles.chips}>
        <Chip label={`${service.duration_minutes} ${t('common.minutes')}`} />
        <Chip label={`${service.price_dzd} ${t('common.dzd')}`} />
      </View>
      <View style={styles.serviceAction}>
        <Text style={styles.serviceActionText}>{t('booking.book')}</Text>
        <Icon name="chevron-back" size={16} color={colors.primary} />
      </View>
    </Pressable>
  );
}

function BarberProfileSkeleton() {
  return (
    <View testID="barber-profile-skeleton" style={styles.skeleton}>
      <View style={styles.skeletonIdentity} />
      <View style={styles.skeletonHeading} />
      <View style={styles.skeletonService} />
      <View style={styles.skeletonService} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], paddingHorizontal: layout.screenPaddingX, paddingBottom: space[10] },
  identityCard: { gap: space[2] },
  identityName: { ...typography.title, textAlign: 'right' },
  identityLocation: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  rating: { ...typography.caption, color: colors.accentText, textAlign: 'right' },
  bio: { ...typography.body, color: colors.textMuted, textAlign: 'right', lineHeight: 24 },
  phone: { ...typography.caption, color: colors.text, textAlign: 'right' },
  outlineAction: { minHeight: 44, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: space[2], borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg },
  outlineActionPressed: { backgroundColor: colors.primarySoft },
  outlineActionText: { ...typography.label, color: colors.primary },
  section: { ...typography.titleSm, textAlign: 'right' },
  serviceCard: { gap: space[3], padding: layout.cardPadding, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  serviceCardSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  serviceCardPressed: { opacity: 0.84 },
  serviceTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  serviceName: { ...typography.bodyStrong, textAlign: 'right' },
  chips: { flexDirection: 'row-reverse', gap: space[2] },
  serviceAction: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start', gap: space[1], borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space[2] },
  serviceActionText: { ...typography.label, color: colors.primary },
  shopCard: { gap: space[3], padding: layout.cardPadding, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  shopCardPressed: { backgroundColor: colors.primarySoft },
  shopHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[2] },
  shopCopy: { flex: 1, alignItems: 'flex-end', gap: space[1] },
  shopName: { ...typography.bodyStrong, textAlign: 'right' },
  shopLocation: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  shopFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space[2] },
  shopAction: { ...typography.label, color: colors.primary },
  errorCard: { gap: space[3], padding: layout.cardPadding, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  skeleton: { gap: space[3] },
  skeletonIdentity: { height: 160, borderRadius: radii['2xl'], backgroundColor: colors.surfaceMuted },
  skeletonHeading: { width: '35%', height: 24, alignSelf: 'flex-end', borderRadius: radii.sm, backgroundColor: colors.surfaceMuted },
  skeletonService: { height: 130, borderRadius: radii.xl, backgroundColor: colors.surfaceMuted },
});
