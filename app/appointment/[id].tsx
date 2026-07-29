import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  appointmentStatusLabel,
  canCancelCustomerAppointment,
  canRescheduleCustomerAppointment,
  formatAppointmentWhen,
  type Appointment,
} from '@/src/booking';
import { Button, Card, Chip, ErrorBanner, Screen, ScreenTitle } from '@/src/components/ui';
import { loadCustomerAppointments, useBooking } from '@/src/hooks/useBooking';
import { t } from '@/src/i18n';
import { colors, space, typography } from '@/src/theme';

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking = useBooking();
  const [item, setItem] = useState<Appointment | null>(null);
  const [stars, setStars] = useState(5);

  const refresh = async () => {
    const items = await loadCustomerAppointments();
    const next = items.find((appointment) => appointment.id === id) ?? null;
    setItem(next);
    if (next?.rating?.stars) setStars(next.rating.stars);
  };

  useEffect(() => {
    void refresh();
  }, [id]);

  const cancel = () => {
    if (!item) return;
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
            if (ok !== false) router.back();
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

  if (!item) {
    return (
      <Screen>
        <ScreenTitle title={t('home.details')} />
        <ErrorBanner error={booking.error} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenTitle title={item.service_name} subtitle={item.barber_name} />
      <ErrorBanner error={booking.error} />
      <Card style={styles.card}>
        <Chip label={appointmentStatusLabel(item.status)} tone="accent" />
        <Text style={styles.meta}>{formatAppointmentWhen(item.starts_at)}</Text>
        <Text style={styles.meta}>
          {item.price_dzd.toLocaleString('ar-DZ')} {t('common.dzd')}
        </Text>
      </Card>

      {canRescheduleCustomerAppointment(item.status) ? (
        <Button
          label={t('home.reschedule')}
          onPress={() =>
            router.push(`/book/${item.barber_id}?appointmentId=${item.id}&serviceId=${item.service_id}`)
          }
        />
      ) : null}
      {item.status === 'booked' ? (
        <Button label={t('home.cancelAppt')} variant="secondary" onPress={cancel} />
      ) : null}
      {item.status === 'booked' ? (
        <Button
          label={t('home.scanQr')}
          variant="secondary"
          onPress={() => router.push({
            pathname: '/scan',
            params: {
              appointmentId: item.id,
              barberName: item.barber_name,
              startsAt: item.starts_at,
            },
          })}
        />
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
                style={styles.starBtn}
              />
            ))}
          </View>
          <Button label={t('common.save')} onPress={() => void rate()} loading={booking.loading} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[2],
    alignItems: 'flex-end',
  },
  meta: {
    ...typography.body,
    textAlign: 'right',
    color: colors.text,
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
  starBtn: {
    minWidth: 48,
    paddingHorizontal: space[2],
  },
});
