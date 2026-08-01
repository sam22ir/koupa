import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import {
  algeriaDate,
  appointmentStatusLabel,
  canCancelCustomerAppointment,
  canRescheduleCustomerAppointment,
  formatBookingDate,
  formatBookingTime,
  type Appointment,
} from '@/src/booking';
import { Button, Card, CustomerStageHeader, ErrorBanner, Screen } from '@/src/components/ui';
import { loadCustomerAppointments, useBooking } from '@/src/hooks/useBooking';
import { t } from '@/src/i18n';
import { colors, radii, space, typography } from '@/src/theme';

function statusStyle(status: Appointment['status']) {
  if (status === 'booked') return styles.statusBooked;
  if (status === 'present') return styles.statusPresent;
  if (status === 'completed') return styles.statusCompleted;
  if (status === 'cancelled') return styles.statusCancelled;
  return styles.statusAbsent;
}

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking = useBooking();
  const [item, setItem] = useState<Appointment | null>(null);
  const [stars, setStars] = useState(5);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);

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
    // Loading is an external data synchronization; keep the stage mounted while it resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const cancel = () => {
    if (!item || item.status !== 'booked') return;
    if (!canCancelCustomerAppointment(item.starts_at)) {
      Alert.alert(t('errors.CANCEL_NOT_ALLOWED'));
      return;
    }
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

  const returnToAppointments = () => router.push('/(customer)/appointments');
  const error = loadError || booking.error;

  if (loading) {
    return (
      <Screen padded={false}>
        <CustomerStageHeader title={t('home.details')} />
        <View testID="appointment-detail-loading" style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen padded={false}>
        <CustomerStageHeader title={t('home.details')} />
        <View style={styles.body}>
          <ErrorBanner error={error || new Error(t('appointments.notFound'))} />
          <Button label={t('appointments.returnToList')} onPress={returnToAppointments} />
        </View>
      </Screen>
    );
  }

  const date = formatBookingDate(algeriaDate(new Date(item.starts_at)));
  const status = appointmentStatusLabel(item.status);

  return (
    <Screen padded={false} scroll>
      <CustomerStageHeader title={item.service_name} subtitle={item.barber_name} />
      <View style={styles.body}>
        <ErrorBanner error={error} />
        <View style={[styles.statusBanner, statusStyle(item.status)]}>
          <Text style={styles.statusTitle}>{status}</Text>
          {item.status === 'cancelled' ? <Text style={styles.statusBody}>{t('appointments.cancelledBody')}</Text> : null}
        </View>

        <Card style={styles.factsCard}>
          <Fact label="التاريخ" value={date} />
          <Fact label="الوقت" value={formatBookingTime(item.starts_at)} />
          <Fact label="السعر" value={`${item.price_dzd.toLocaleString('ar-DZ')} ${t('common.dzd')}`} />
          <Fact label="الحالة" value={status} />
        </Card>

        {item.status === 'booked' ? (
          <View style={styles.actionsBlock}>
            <Button
              label={t('home.scanQr')}
              variant="secondary"
              onPress={() => router.push({ pathname: '/scan', params: { appointmentId: item.id, barberName: item.barber_name, startsAt: item.starts_at } })}
            />
            {canRescheduleCustomerAppointment(item.status) ? (
              <Button
                label={t('home.reschedule')}
                variant="secondary"
                onPress={() => router.push(`/book/${item.barber_id}?appointmentId=${item.id}&serviceId=${item.service_id}`)}
              />
            ) : null}
            {canCancelCustomerAppointment(item.starts_at) ? (
              <Button label={t('home.cancelAppt')} variant="secondary" onPress={cancel} />
            ) : null}
          </View>
        ) : null}

        {item.status === 'completed' ? (
          <View style={styles.rateBlock}>
            <Text style={styles.section}>{item.rating ? t('appointments.editRating') : t('appointments.rate')}</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  label={String(value)}
                  variant={stars === value ? 'primary' : 'secondary'}
                  onPress={() => setStars(value)}
                  style={styles.starButton}
                />
              ))}
            </View>
            <Button label={t('common.save')} onPress={() => void rate()} loading={booking.loading} />
          </View>
        ) : null}

        <Button label={t('appointments.returnToList')} variant="ghost" onPress={returnToAppointments} />
      </View>
    </Screen>
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
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: space[5],
    gap: space[3],
  },
  statusBanner: {
    borderRadius: radii.lg,
    padding: space[4],
    gap: space[1],
  },
  statusBooked: { backgroundColor: colors.accentSoft },
  statusPresent: { backgroundColor: colors.primarySoft },
  statusCompleted: { backgroundColor: colors.successSoft },
  statusCancelled: { backgroundColor: colors.surfaceMuted },
  statusAbsent: { backgroundColor: colors.dangerSoft },
  statusTitle: {
    ...typography.bodyStrong,
    textAlign: 'right',
  },
  statusBody: {
    ...typography.caption,
    textAlign: 'right',
  },
  factsCard: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: space[3],
  },
  fact: {
    width: '47%',
    gap: space[1],
    alignItems: 'flex-end',
  },
  factLabel: {
    ...typography.caption,
    textAlign: 'right',
  },
  factValue: {
    ...typography.bodyStrong,
    textAlign: 'right',
  },
  actionsBlock: {
    gap: space[2],
  },
  rateBlock: {
    gap: space[3],
  },
  section: {
    ...typography.titleSm,
    textAlign: 'right',
  },
  stars: {
    flexDirection: 'row-reverse',
    gap: space[2],
  },
  starButton: {
    minWidth: 48,
  },
});
