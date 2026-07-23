import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { PrimaryButton } from '@/src/components/atoms/PrimaryButton';
import { BrandLogo } from '@/src/components/atoms/BrandLogo';
import { Screen } from '@/src/components/organisms/Screen';
import { copy } from '@/src/data/copy';
import { CustomerNavigation } from '@/src/components/molecules/CustomerNavigation';
import { formatBookingTime, type Appointment } from '@/src/booking';
import { loadCustomerAppointments } from '@/src/hooks/useBooking';
import { colors, spacing, typography } from '@/src/theme';

export interface CustomerHomeProps {}
export default function CustomerHome(_: CustomerHomeProps) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  useEffect(() => { void loadCustomerAppointments().then((items) => setAppointment(items.find((item) => item.status === 'booked' || item.status === 'present') ?? null)).catch(() => undefined); }, []);
  return <Screen footer={<CustomerNavigation active="الرئيسية" />}><View style={styles.header}><View><Text style={styles.app}>{copy.appName}</Text><Text style={styles.welcome}>{copy.customer.homeTitle}</Text></View><MaterialCommunityIcons name="account-circle-outline" size={30} color={colors.outline} /></View><View style={styles.empty}>{appointment ? <><MaterialCommunityIcons name="calendar-check-outline" size={42} color={colors.primary} /><Text style={styles.title}>{appointment.service_name}</Text><Text style={styles.body}>{appointment.barber_name} - {formatBookingTime(appointment.starts_at)}</Text><PrimaryButton label="عرض الموعد" onPress={() => router.push('/(customer)/appointments')} /></> : <><BrandLogo size={112} /><MaterialCommunityIcons name="calendar-blank-outline" size={42} color={colors.outline} /><Text style={styles.title}>{copy.customer.emptyTitle}</Text><Text style={styles.body}>{copy.customer.emptyBody}</Text><PrimaryButton label={copy.customer.findBarber} onPress={() => router.push('/(customer)/find')} /></>}</View></Screen>;
}
const styles = StyleSheet.create({ header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }, app: { color: colors.primary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title, textAlign: 'right' }, welcome: { color: colors.charcoal, fontFamily: typography.fontFamily.medium, fontSize: typography.size.label, textAlign: 'right' }, empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md }, title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title, textAlign: 'center' }, body: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, lineHeight: typography.line.body, textAlign: 'center' } });
