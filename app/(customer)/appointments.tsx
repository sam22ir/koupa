import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { CustomerNavigation } from '@/src/components/molecules/CustomerNavigation';
import { Screen } from '@/src/components/organisms/Screen';
import {
  appointmentStatusLabel,
  canCancelCustomerAppointment,
  canRescheduleCustomerAppointment,
  formatAppointmentWhen,
  type Appointment,
} from '@/src/booking';
import { copy } from '@/src/data/copy';
import { loadCustomerAppointments, useBooking } from '@/src/hooks/useBooking';
import { canEditRating, canRateAppointment } from '@/src/ratings';
import { colors, radii, spacing, typography } from '@/src/theme';

export default function CustomerAppointments() {
  const { loading, error, cancelCustomer } = useBooking();
  const [appointments, setAppointments] = useState<readonly Appointment[]>([]);
  const load = useCallback(() => {
    void loadCustomerAppointments().then(setAppointments).catch(() => undefined);
  }, []);
  useFocusEffect(load);

  const cancel = (item: Appointment) => {
    Alert.alert(copy.customer.cancelConfirmTitle, copy.customer.cancelConfirmBody, [
      { text: copy.customer.keepAppointment, style: 'cancel' },
      {
        text: copy.customer.cancelConfirmAction,
        style: 'destructive',
        onPress: () => {
          void cancelCustomer(item.id).then((ok) => {
            if (ok) load();
          });
        },
      },
    ]);
  };

  return (
    <Screen footer={<CustomerNavigation active="مواعيدي" />}>
      <View style={styles.content}>
        <Text style={styles.title}>{copy.customer.appointmentsTitle}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <Text style={styles.muted}>{copy.customer.loading}</Text> : null}
        {!loading && !appointments.length ? <Text style={styles.muted}>{copy.customer.appointmentsEmpty}</Text> : null}
        {appointments.map((item) => {
          const canCancel = canRescheduleCustomerAppointment(item.status) && canCancelCustomerAppointment(item.starts_at);
          const canReschedule = canRescheduleCustomerAppointment(item.status);
          const canRate = canRateAppointment(item.status, item.rating);
          const canEdit = canEditRating(item.rating);
          return (
            <View key={item.id} style={styles.card}>
              <Text style={styles.name}>{item.service_name}</Text>
              <Text style={styles.meta}>{item.barber_name}</Text>
              <Text style={styles.meta}>{formatAppointmentWhen(item.starts_at)}</Text>
              <Text style={styles.meta}>
                {item.price_dzd} {copy.common.currency} - {appointmentStatusLabel(item.status)}
              </Text>
              {item.rating ? (
                <Text style={styles.rating}>
                  {copy.customer.yourRating}: {'★'.repeat(item.rating.stars)}
                  {'☆'.repeat(5 - item.rating.stars)}
                </Text>
              ) : null}
              {canReschedule ? (
                <View style={styles.actions}>
                  {canCancel ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={copy.customer.cancelAppointment} onPress={() => cancel(item)}>
                      <Text style={styles.cancel}>{copy.customer.cancelAppointment}</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.cutoff}>{copy.customer.cancelCutoff}</Text>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={copy.customer.rescheduleAppointment}
                    onPress={() => router.push({ pathname: '/(customer)/reschedule/[id]', params: { id: item.id } })}
                  >
                    <Text style={styles.reschedule}>{copy.customer.rescheduleAppointment}</Text>
                  </Pressable>
                </View>
              ) : null}
              {canRate || canEdit ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={canEdit ? copy.customer.editRating : copy.customer.rateAppointment}
                  onPress={() => router.push({ pathname: '/(customer)/rate/[id]', params: { id: item.id } })}
                >
                  <Text style={styles.rate}>{canEdit ? copy.customer.editRating : copy.customer.rateAppointment}</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: spacing.md },
  title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title, textAlign: 'right' },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  name: { color: colors.charcoal, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.label, textAlign: 'right' },
  meta: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, textAlign: 'right' },
  rating: { color: colors.gold, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body, textAlign: 'right' },
  actions: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.xs },
  cancel: { color: colors.danger, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body, textAlign: 'right' },
  reschedule: { color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body, textAlign: 'right' },
  rate: { color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body, textAlign: 'right', marginTop: spacing.xs },
  cutoff: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.caption, textAlign: 'right', flex: 1 },
  muted: { color: colors.muted, fontFamily: typography.fontFamily.regular, textAlign: 'center' },
  error: { color: colors.danger, fontFamily: typography.fontFamily.regular, textAlign: 'right' },
});
