import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  bookingDates,
  formatBookingDate,
  formatBookingTime,
  type BarberProfile,
  type BookingSlot,
} from '@/src/booking';
import { Button, Chip, CustomerStageHeader, EmptyState, ErrorBanner, Screen } from '@/src/components/ui';
import { useBooking } from '@/src/hooks/useBooking';
import { t } from '@/src/i18n';
import { colors, radii, space, typography } from '@/src/theme';

export default function BookScreen() {
  const { barberId, appointmentId, serviceId: initialServiceId } = useLocalSearchParams<{
    barberId: string;
    appointmentId?: string;
    serviceId?: string;
  }>();
  const { getBarber, getSlots, book, reschedule, loading, error } = useBooking();
  const [barber, setBarber] = useState<BarberProfile | null>(null);
  const [serviceId, setServiceId] = useState(initialServiceId ?? '');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<readonly BookingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [message, setMessage] = useState('');

  const dates = useMemo(
    () => bookingDates(barber?.booking_window_days ?? 7),
    [barber?.booking_window_days],
  );

  useEffect(() => {
    if (!barberId) return;
    let active = true;
    void getBarber(barberId).then((rows) => {
      if (!active) return;
      const next = rows?.[0] ?? null;
      setBarber(next);
      setServiceId((current) => current || next?.services[0]?.id || '');
      setDate((current) => current || dates[0] || '');
    });
    return () => {
      active = false;
    };
  }, [barberId, getBarber, dates]);

  useEffect(() => {
    if (!barberId || !serviceId || !date) return;
    let active = true;
    void getSlots(barberId, serviceId, date).then((next) => {
      if (active) setSlots(next ?? []);
    });
    return () => {
      active = false;
    };
  }, [barberId, getSlots, date, serviceId]);

  const confirm = async () => {
    setMessage('');
    if (!serviceId || !selectedSlot) return;
    if (appointmentId) {
      const result = await reschedule(appointmentId, serviceId, selectedSlot);
      if (result) {
        setMessage(t('common.done'));
        router.replace('/(customer)/appointments');
      }
      return;
    }
    const result = await book(barberId, serviceId, selectedSlot);
    if (result) {
      setMessage(t('common.done'));
      router.replace('/(customer)/home');
    }
  };

  return (
    <Screen padded={false} scroll>
      <CustomerStageHeader
        title={appointmentId ? t('home.reschedule') : t('booking.book')}
        subtitle={barber?.name}
      />
      <View style={styles.body}>
        <ErrorBanner error={error} />
        {message ? <Text style={styles.message}>{message}</Text> : null}

      <Text style={styles.section}>{t('booking.chooseService')}</Text>
      <View style={styles.wrap}>
        {barber?.services.map((service) => (
          <Pressable key={service.id} onPress={() => setServiceId(service.id)}>
            <Chip
              label={`${service.name} · ${service.price_dzd} ${t('common.dzd')}`}
              tone={serviceId === service.id ? 'primary' : 'neutral'}
            />
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>{t('booking.chooseDate')}</Text>
      <View style={styles.wrap}>
        {dates.map((value) => (
          <Pressable key={value} onPress={() => setDate(value)}>
            <Chip label={formatBookingDate(value)} tone={date === value ? 'primary' : 'neutral'} />
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>{t('booking.chooseSlot')}</Text>
      {slots.length === 0 ? <EmptyState title={t('booking.noSlots')} /> : null}
      <View style={styles.wrap}>
        {slots.map((slot) => (
          <Pressable key={slot.starts_at} onPress={() => setSelectedSlot(slot.starts_at)} style={[styles.slot, selectedSlot === slot.starts_at && styles.slotOn]}>
            <Text style={styles.slotText}>{formatBookingTime(slot.starts_at)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.pay}>{t('booking.payAtShop')}</Text>
        <Button
        label={appointmentId ? t('home.reschedule') : t('booking.confirmBook')}
        onPress={() => void confirm()}
        loading={loading}
        disabled={!selectedSlot || !serviceId}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: space[5],
    gap: space[3],
  },
  section: {
    ...typography.titleSm,
    textAlign: 'right',
  },
  wrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: space[2],
  },
  slot: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  slotOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  slotText: {
    ...typography.label,
    color: colors.text,
  },
  pay: {
    ...typography.caption,
    textAlign: 'center',
  },
  message: {
    ...typography.caption,
    color: colors.primary,
    textAlign: 'right',
  },
});
