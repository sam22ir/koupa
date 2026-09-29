import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  algeriaDate,
  appointmentStatusLabel,
  formatBookingDate,
  formatBookingTime,
  type Appointment,
} from '@/src/booking';
import { BackButton, Button, Card, Chip, CustomerStageHeader, ErrorBanner, Icon, Screen } from '@/src/components/ui';
import { DirectionsModal } from '@/src/components/navigation/DirectionsModal';
import {
  appointmentOverflowActions,
  appointmentPrimaryKind,
} from '@/src/features/customer-home/appointmentFirstView';
import { loadCustomerAppointments, useBooking } from '@/src/hooks/useBooking';
import { t } from '@/src/i18n';
import { colors, layout, radii, space, typography } from '@/src/theme';

function statusTone(status: Appointment['status']): 'neutral' | 'accent' | 'primary' {
  if (status === 'booked') return 'accent';
  if (status === 'present') return 'primary';
  return 'neutral';
}

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
  const status = appointmentStatusLabel(item.status);

  return (
    <Screen padded={false} scroll>
      <CustomerStageHeader title={t('home.details')} context={t('auth.roleCustomer')} trailing={<BackButton fallback="/(customer)/appointments" />} />
      <View style={styles.body}>
        <ErrorBanner error={error} />

        <Card style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <Chip label={status} tone={statusTone(item.status)} />
            <Text style={styles.date}>{date}</Text>
          </View>
          <Text style={styles.service}>{item.service_name}</Text>
          <View style={styles.person}>
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
              <Icon name="navigate-outline" size={18} color={colors.primary} />
              <Text style={styles.locationLabel}>{t('find.openLocation')}</Text>
            </Pressable>
          ) : null}
          <View style={styles.facts}>
            <Fact label={t('common.time')} value={formatBookingTime(item.starts_at)} />
            <Fact label={t('common.price')} value={`${item.price_dzd.toLocaleString('ar-DZ')} ${t('common.dzd')}`} />
          </View>
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
          onDirections={item.location_maps_url ? () => setDirectionsVisible(true) : undefined}
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
  onDirections,
}: {
  readonly appointment: Appointment;
  readonly onScan: () => void;
  readonly onReschedule: () => void;
  readonly onCancel: () => void;
  readonly onDirections?: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [now] = useState(() => Date.now());
  const primary = appointmentPrimaryKind(appointment, now);
  const overflow = appointmentOverflowActions(appointment, now);

  return (
    <View style={styles.detailActions}>
      {primary === 'scan' ? <Button label={t('home.scanQr')} onPress={onScan} /> : null}
      {overflow.length ? (
        <Button
          label={moreOpen ? t('home.hideActions') : t('home.moreActions')}
          variant="ghost"
          onPress={() => setMoreOpen((open) => !open)}
        />
      ) : null}
      {moreOpen ? (
        <View style={styles.overflow}>
          {overflow.includes('directions') && onDirections ? (
            <Button label={t('directions.action')} variant="secondary" onPress={onDirections} />
          ) : null}
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

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], paddingHorizontal: layout.screenPaddingX, paddingBottom: space[10] },
  detailActions: { gap: space[2] },
  overflow: { gap: space[2] },
  summaryCard: { gap: space[4] },
  summaryTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: space[3] },
  date: { ...typography.caption, color: colors.textMuted, flexShrink: 1, textAlign: 'right' },
  service: { ...typography.title, textAlign: 'right' },
  person: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[3] },
  personCopy: { flex: 1, alignItems: 'flex-end', gap: 2 },
  personName: { ...typography.bodyStrong, textAlign: 'right' },
  shopName: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  locationRow: { minHeight: 44, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: space[2], borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, paddingHorizontal: space[3] },
  locationPressed: { backgroundColor: colors.primarySoft },
  locationLabel: { ...typography.label, color: colors.primary },
  facts: { flexDirection: 'row-reverse', gap: space[3], borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space[3] },
  fact: { flex: 1, gap: space[1], alignItems: 'flex-end' },
  factLabel: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  factValue: { ...typography.bodyStrong, textAlign: 'right' },
  ratingCard: { gap: space[3] },
  section: { ...typography.titleSm, textAlign: 'right' },
  stars: { flexDirection: 'row-reverse', justifyContent: 'center', gap: space[2] },
  starButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
  starSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  starPressed: { transform: [{ scale: 0.96 }] },
  errorBody: { paddingHorizontal: layout.screenPaddingX, paddingVertical: space[4] },
  errorCard: { gap: space[3], padding: layout.cardPadding, borderWidth: 1, borderColor: colors.border, borderRadius: radii['2xl'], backgroundColor: colors.surface },
  skeletonBody: { gap: space[3], paddingHorizontal: layout.screenPaddingX, paddingVertical: space[4] },
  skeletonSummary: { gap: space[4], padding: layout.cardPadding, borderRadius: radii['2xl'], backgroundColor: colors.surface },
  skeletonTop: { width: '45%', height: 24, alignSelf: 'flex-end', borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  skeletonTitle: { width: '70%', height: 26, alignSelf: 'flex-end', borderRadius: radii.sm, backgroundColor: colors.surfaceMuted },
  skeletonPerson: { width: '75%', height: 48, alignSelf: 'flex-end', borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
  skeletonFacts: { width: '100%', height: 60, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
  skeletonActions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: space[2] },
  skeletonTile: { width: '48%', height: 86, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
});
