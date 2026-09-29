import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Alert } from '@/src/utils/alert';

import {
  algeriaDate,
  formatBookingDate,
  formatBookingTime,
  type Appointment,
} from '@/src/booking';
import {
  AppointmentStatusBadge,
  BackButton,
  Button,
  Card,
  CustomerStageHeader,
  ErrorBanner,
  Icon,
  Screen,
} from '@/src/components/ui';
import { DirectionsModal } from '@/src/components/navigation/DirectionsModal';
import {
  appointmentOverflowActions,
  appointmentPrimaryKind,
} from '@/src/features/customer-home/appointmentFirstView';
import { loadCustomerAppointments, useBooking } from '@/src/hooks/useBooking';
import { t } from '@/src/i18n';
import { colors, elevation, layout, radii, space, typography } from '@/src/theme';

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking = useBooking();
  const [item, setItem] = useState<Appointment | null>(null);
  const [stars, setStars] = useState(5);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [directionsVisible, setDirectionsVisible] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const items = await loadCustomerAppointments();
      const next = items.find((appointment) => appointment.id === id) ?? null;
      setItem(next);
      if (next?.rating?.stars) setStars(next.rating.stars);
    } catch (caught) {
      setLoadError(caught);
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Loading is an external data synchronization; keep the header mounted while it resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const cancel = () => {
    if (!item || item.status !== 'booked') return;
    Alert.alert(t('home.cancelAppt'), t('home.cancelConfirm'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('common.yes'),
        style: 'destructive',
        onPress: () => {
          void booking.cancelCustomer(item.id).then((ok) => {
            if (ok !== false) router.replace('/(customer)/appointments');
          });
        },
      },
    ]);
  };

  const rate = async () => {
    if (!item) return;
    const result = await booking.rateAppointment(item.id, stars);
    if (result) await refresh();
  };

  const returnToAppointments = () => router.dismissTo('/(customer)/appointments');
  const error = loadError || booking.error;

  if (loading) {
    return (
      <Screen padded={false}>
        <CustomerStageHeader title={t('home.details')} context={t('auth.roleCustomer')} trailing={<BackButton fallback="/(customer)/appointments" />} />
        <AppointmentDetailSkeleton />
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen padded={false}>
        <CustomerStageHeader title={t('home.details')} context={t('auth.roleCustomer')} trailing={<BackButton fallback="/(customer)/appointments" />} />
        <View style={styles.errorBody}>
          <View style={styles.errorCard}>
            <ErrorBanner error={error || new Error(t('appointments.notFound'))} />
            {error ? <Button label={t('common.retry')} variant="secondary" onPress={() => void refresh()} /> : null}
            <Button label={t('appointments.returnToList')} onPress={returnToAppointments} />
          </View>
        </View>
      </Screen>
    );
  }

  const date = formatBookingDate(algeriaDate(new Date(item.starts_at)));

  return (
    <Screen padded={false} scroll>
      <CustomerStageHeader title={t('home.details')} context={t('auth.roleCustomer')} trailing={<BackButton fallback="/(customer)/appointments" />} />
      <View style={styles.body}>
        <ErrorBanner error={error} />

        <Card elevated style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <Text style={styles.service}>{item.service_name}</Text>
            <AppointmentStatusBadge status={item.status} />
          </View>
          <View style={styles.whenPanel}>
            <View style={styles.whenIcon}>
              <Icon name="calendar-outline" size={22} color={colors.primarySoftText} />
            </View>
            <View style={styles.whenCopy}>
              <Text style={styles.whenTime}>{formatBookingTime(item.starts_at)}</Text>
              <Text style={styles.whenDate}>{date}</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.placeCard}>
          <View style={styles.person}>
            <View style={styles.placeIcon}>
              <Icon name="cut-outline" size={20} color={colors.primarySoftText} />
            </View>
            <View style={styles.personCopy}>
              <Text style={styles.personName}>{item.barber_name ?? '—'}</Text>
              {item.shop_name ? <Text style={styles.shopName}>{item.shop_name}</Text> : null}
            </View>
          </View>
          {item.location_maps_url ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('find.openLocation')}
              onPress={() => setDirectionsVisible(true)}
              style={({ pressed }) => [styles.locationRow, pressed && styles.locationPressed]}
            >
              <Icon name="navigate-outline" size={18} color={colors.primarySoftText} />
              <Text style={styles.locationLabel}>{t('find.openLocation')}</Text>
            </Pressable>
          ) : null}
        </Card>

        <Card style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('common.price')}</Text>
            <Text style={styles.priceValue}>{`${item.price_dzd.toLocaleString('ar-DZ')} ${t('common.dzd')}`}</Text>
          </View>
          <Text style={styles.payNote}>{t('booking.payAtShop')}</Text>
        </Card>

        <AppointmentDetailActions
          appointment={item}
          onScan={() => router.push({ pathname: '/scan', params: { appointmentId: item.id, barberName: item.barber_name, startsAt: item.starts_at } })}
          onReschedule={() => router.push({
            pathname: '/book/[barberId]',
            params: {
              barberId: item.barber_id,
              appointmentId: item.id,
              serviceId: item.service_id,
              returnTo: `/appointment/${item.id}`,
            },
          })}
          onCancel={cancel}
        />

        <DirectionsModal
          visible={directionsVisible}
          onClose={() => setDirectionsVisible(false)}
          mapsUrl={item.location_maps_url}
          destinationName={item.shop_name || item.barber_name}
        />

        {item.status === 'completed' ? (
          <Card style={styles.ratingCard}>
            <Text style={styles.section}>{item.rating ? t('appointments.editRating') : t('appointments.rate')}</Text>
            <View style={styles.stars} accessibilityRole="radiogroup">
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={`تقييم ${value} من 5`}
                  accessibilityState={{ selected: stars === value }}
                  onPress={() => setStars(value)}
                  style={({ pressed }) => [styles.starButton, stars === value && styles.starSelected, pressed && styles.starPressed]}
                >
                  <Icon name={stars >= value ? 'star' : 'star-outline'} size={24} color={stars >= value ? colors.accent : colors.textMuted} />
                </Pressable>
              ))}
            </View>
            <Button label={t('common.save')} onPress={() => void rate()} loading={booking.loading} />
          </Card>
        ) : null}

        <Button label={t('appointments.returnToList')} variant="ghost" onPress={returnToAppointments} />
      </View>
    </Screen>
  );
}

function AppointmentDetailActions({
  appointment,
  onScan,
  onReschedule,
  onCancel,
}: {
  readonly appointment: Appointment;
  readonly onScan: () => void;
  readonly onReschedule: () => void;
  readonly onCancel: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [now] = useState(() => Date.now());
  const primary = appointmentPrimaryKind(appointment, now);
  // Directions already has its own button on the barber card here.
  const overflow = appointmentOverflowActions(appointment, now).filter((action) => action !== 'directions');

  return (
    <View style={styles.detailActions}>
      {primary === 'scan' ? <Button label={t('home.scanQr')} onPress={onScan} /> : null}
      {overflow.length ? (
        <Button
          label={moreOpen ? t('home.hideActions') : t('home.moreActions')}
          variant="outline"
          onPress={() => setMoreOpen((open) => !open)}
        />
      ) : null}
      {moreOpen ? (
        <View style={styles.overflow}>
          {overflow.includes('reschedule') ? (
            <Button label={t('home.rescheduleAction')} variant="secondary" onPress={onReschedule} />
          ) : null}
          {overflow.includes('cancel') ? (
            <Button label={t('home.cancelAppt')} variant="danger" onPress={onCancel} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function AppointmentDetailSkeleton() {
  return (
    <View testID="appointment-detail-skeleton" style={styles.skeletonBody}>
      <View style={styles.skeletonSummary}>
        <View style={styles.skeletonTop} />
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonPerson} />
        <View style={styles.skeletonFacts} />
      </View>
      <View testID="appointment-detail-loading" style={styles.skeletonActions}>
        <View style={styles.skeletonTile} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], paddingHorizontal: layout.screenPaddingX, paddingBottom: space[10] },
  detailActions: { gap: space[2] },
  overflow: { gap: space[2] },
  summaryCard: { gap: space[4] },
  whenPanel: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[3], padding: space[4], borderRadius: radii.md, backgroundColor: colors.primarySoft },
  whenIcon: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  whenCopy: { flex: 1, alignItems: 'flex-end' },
  whenTime: { ...typography.numeric, fontSize: 26, lineHeight: 36, color: colors.primarySoftText },
  whenDate: { ...typography.label, color: colors.text, textAlign: 'right' },
  placeCard: { gap: space[3], ...elevation.card },
  placeIcon: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  priceCard: { gap: space[1], ...elevation.card },
  priceRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'baseline' },
  priceLabel: { ...typography.bodyStrong, textAlign: 'right' },
  priceValue: { ...typography.numeric, fontSize: 20, lineHeight: 28, color: colors.primary },
  payNote: { ...typography.caption, textAlign: 'right' },
  summaryTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', gap: space[3] },
  service: { ...typography.title, flex: 1, textAlign: 'right' },
  person: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[3] },
  personCopy: { flex: 1, alignItems: 'flex-end', gap: 2 },
  personName: { ...typography.bodyStrong, textAlign: 'right' },
  shopName: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  locationRow: { minHeight: 44, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: space[2], borderRadius: radii.md, paddingHorizontal: space[3], backgroundColor: colors.primarySoft },
  locationPressed: { backgroundColor: colors.border },
  locationLabel: { ...typography.label, color: colors.primarySoftText },
  facts: { borderTopWidth: 1, borderTopColor: colors.borderSubtle, paddingTop: space[4] },
  ratingCard: { gap: space[3], ...elevation.card },
  section: { ...typography.titleSm, textAlign: 'right' },
  stars: { flexDirection: 'row-reverse', justifyContent: 'center', gap: space[2] },
  starButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  starSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  starPressed: { transform: [{ scale: 0.96 }] },
  errorBody: { paddingHorizontal: layout.screenPaddingX, paddingVertical: space[4] },
  errorCard: { gap: space[3], padding: layout.cardPadding, borderRadius: radii.lg, backgroundColor: colors.surface, ...elevation.card },
  skeletonBody: { gap: space[3], paddingHorizontal: layout.screenPaddingX, paddingVertical: space[4] },
  skeletonSummary: { gap: space[4], padding: layout.cardPadding, borderRadius: radii.lg, backgroundColor: colors.surface },
  skeletonTop: { width: '45%', height: 24, alignSelf: 'flex-end', borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  skeletonTitle: { width: '70%', height: 26, alignSelf: 'flex-end', borderRadius: radii.sm, backgroundColor: colors.surfaceMuted },
  skeletonPerson: { width: '75%', height: 48, alignSelf: 'flex-end', borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
  skeletonFacts: { width: '100%', height: 60, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
  skeletonActions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: space[2] },
  skeletonTile: { width: '48%', height: 86, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
});
