import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { PrimaryButton } from '@/src/components/atoms/PrimaryButton';
import { BrandLogo } from '@/src/components/atoms/BrandLogo';
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
import { colors, radii, spacing, typography } from '@/src/theme';

export default function CustomerHome() {
  const { cancelCustomer } = useBooking();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const load = useCallback(() => {
    void loadCustomerAppointments()
      .then((items) => setAppointment(items.find((item) => item.status === 'booked' || item.status === 'present') ?? null))
      .catch(() => undefined);
  }, []);
  useFocusEffect(load);

  const cancel = () => {
    if (!appointment || !canCancelCustomerAppointment(appointment.starts_at)) return;
    Alert.alert(copy.customer.cancelConfirmTitle, copy.customer.cancelConfirmBody, [
      { text: copy.customer.keepAppointment, style: 'cancel' },
      {
        text: copy.customer.cancelConfirmAction,
        style: 'destructive',
        onPress: () => {
          void cancelCustomer(appointment.id).then((ok) => {
            if (ok) load();
          });
        },
      },
    ]);
  };

  return (
    <Screen footer={<CustomerNavigation active="الرئيسية" />}>
      <View style={styles.header}>
        <View>
          <Text style={styles.app}>{copy.appName}</Text>
          <Text style={styles.welcome}>{copy.customer.homeTitle}</Text>
        </View>
        <MaterialCommunityIcons name="account-circle-outline" size={30} color={colors.outline} />
      </View>

      {appointment ? (
        <View style={styles.card}>
          <Text style={styles.eyebrow}>{copy.customer.nextAppointment}</Text>
          <Text style={styles.title}>{appointment.service_name}</Text>
          <Text style={styles.body}>{appointment.barber_name}</Text>
          <Text style={styles.body}>{formatAppointmentWhen(appointment.starts_at)}</Text>
          <Text style={styles.meta}>
            {appointment.price_dzd} {copy.common.currency} - {appointmentStatusLabel(appointment.status)}
          </Text>
          <View style={styles.actions}>
            <PrimaryButton label={copy.customer.viewAppointment} onPress={() => router.push('/(customer)/appointments')} />
            {appointment.status === 'booked' ? (
              <PrimaryButton label={copy.customer.scanQr} variant="outline" onPress={() => router.push('/(customer)/scan')} />
            ) : null}
            {canRescheduleCustomerAppointment(appointment.status) ? (
              <View style={styles.secondaryActions}>
                {canCancelCustomerAppointment(appointment.starts_at) ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={copy.customer.cancelAppointment} onPress={cancel}>
                    <Text style={styles.cancel}>{copy.customer.cancelAppointment}</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.cutoff}>{copy.customer.cancelCutoff}</Text>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={copy.customer.rescheduleAppointment}
                  onPress={() => router.push({ pathname: '/(customer)/reschedule/[id]', params: { id: appointment.id } })}
                >
                  <Text style={styles.reschedule}>{copy.customer.rescheduleAppointment}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.empty}>
          <BrandLogo size={112} />
          <MaterialCommunityIcons name="calendar-blank-outline" size={42} color={colors.outline} />
          <Text style={styles.title}>{copy.customer.emptyTitle}</Text>
          <Text style={styles.body}>{copy.customer.emptyBody}</Text>
          <PrimaryButton label={copy.customer.findBarber} onPress={() => router.push('/(customer)/find')} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  app: { color: colors.primary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title, textAlign: 'right' },
  welcome: { color: colors.charcoal, fontFamily: typography.fontFamily.medium, fontSize: typography.size.label, textAlign: 'right' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  card: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  eyebrow: { color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.caption, textAlign: 'right' },
  title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title, textAlign: 'right' },
  body: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, lineHeight: typography.line.body, textAlign: 'right' },
  meta: { color: colors.charcoal, fontFamily: typography.fontFamily.medium, fontSize: typography.size.body, textAlign: 'right' },
  actions: { marginTop: spacing.sm, gap: spacing.md },
  secondaryActions: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: spacing.sm },
  cancel: { color: colors.danger, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body, textAlign: 'right' },
  reschedule: { color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body, textAlign: 'right' },
  cutoff: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.caption, textAlign: 'right', flex: 1 },
});
