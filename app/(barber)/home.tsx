import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { PrimaryButton } from '@/src/components/atoms/PrimaryButton';
import { BarberNavigation } from '@/src/components/molecules/BarberNavigation';
import { Screen } from '@/src/components/organisms/Screen';
import { appointmentStatusLabel, formatBookingTime, type TodayAppointment } from '@/src/booking';
import { copy } from '@/src/data/copy';
import { useBooking } from '@/src/hooks/useBooking';
import { colors, radii, spacing, typography } from '@/src/theme';

export default function BarberHome() {
  const { loading, error, today, markPresent, cancelBarber } = useBooking();
  const [appointments, setAppointments] = useState<readonly TodayAppointment[]>([]);

  const load = useCallback(() => {
    void today().then((items) => {
      if (items) setAppointments(items);
    });
  }, [today]);

  useFocusEffect(load);

  const present = async (id: string) => {
    const result = await markPresent(id);
    if (result) load();
  };

  const cancel = (id: string) => {
    Alert.alert(copy.barber.cancelConfirmTitle, copy.barber.cancelConfirmBody, [
      { text: copy.barber.keepAppointment, style: 'cancel' },
      {
        text: copy.barber.cancelConfirmAction,
        style: 'destructive',
        onPress: () => {
          void cancelBarber(id).then((ok) => {
            if (ok) load();
          });
        },
      },
    ]);
  };

  return (
    <Screen footer={<BarberNavigation active="اليوم" />}>
      <View style={styles.header}>
        <Text style={styles.title}>{copy.barber.todayTitle}</Text>
        <PrimaryButton label={copy.barber.showQr} onPress={() => router.push('/(barber)/qr')} />
      </View>
      {loading ? <Text style={styles.body}>{copy.barber.loading}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !appointments.length ? (
        <View style={styles.empty}>
          <Text style={styles.body}>{copy.barber.todayEmpty}</Text>
        </View>
      ) : (
        appointments.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.name}>{item.customer_name}</Text>
            <Text selectable style={styles.body}>
              {item.customer_phone}
            </Text>
            <Text style={styles.body}>
              {item.service_name} - {formatBookingTime(item.starts_at)} - {item.price_dzd} {copy.common.currency}
            </Text>
            <Text style={styles.status}>{appointmentStatusLabel(item.status)}</Text>
            {item.status === 'booked' ? (
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" accessibilityLabel={copy.barber.markPresent} onPress={() => void present(item.id)}>
                  <Text style={styles.present}>{copy.barber.markPresent}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={copy.barber.cancelAppointment} onPress={() => cancel(item.id)}>
                  <Text style={styles.cancel}>{copy.barber.cancelAppointment}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md },
  empty: { flex: 1, justifyContent: 'center', gap: spacing.sm },
  title: {
    color: colors.charcoal,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    lineHeight: typography.line.title,
    textAlign: 'right',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  name: { color: colors.charcoal, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.label, textAlign: 'right' },
  body: {
    color: colors.muted,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    lineHeight: typography.line.body,
    textAlign: 'right',
  },
  status: { color: colors.charcoal, fontFamily: typography.fontFamily.medium, fontSize: typography.size.body, textAlign: 'right' },
  actions: { flexDirection: 'row-reverse', gap: spacing.lg, marginTop: spacing.xs },
  present: { color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body },
  cancel: { color: colors.danger, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body },
  error: { color: colors.danger, fontFamily: typography.fontFamily.regular, textAlign: 'right' },
});
