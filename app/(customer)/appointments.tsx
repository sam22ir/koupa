import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { CustomerNavigation } from '@/src/components/molecules/CustomerNavigation';
import { Screen } from '@/src/components/organisms/Screen';
import { formatBookingTime, type Appointment } from '@/src/booking';
import { loadCustomerAppointments, useBooking } from '@/src/hooks/useBooking';
import { colors, radii, spacing, typography } from '@/src/theme';

export default function CustomerAppointments() {
  const { loading, error, cancelCustomer } = useBooking(); const [appointments, setAppointments] = useState<readonly Appointment[]>([]);
  const load = useCallback(() => { void loadCustomerAppointments().then(setAppointments).catch(() => undefined); }, []); useEffect(load, [load]);
  const cancel = async (id: string) => { if (await cancelCustomer(id)) load(); };
  return <Screen footer={<CustomerNavigation active="مواعيدي" />}><View style={styles.content}><Text style={styles.title}>مواعيدي</Text>{error ? <Text style={styles.error}>{error}</Text> : null}{loading ? <Text style={styles.muted}>جارٍ التحميل...</Text> : null}{!appointments.length ? <Text style={styles.muted}>لا توجد مواعيد حتى الآن.</Text> : appointments.map((item) => <View key={item.id} style={styles.card}><Text style={styles.name}>{item.service_name}</Text><Text style={styles.meta}>{item.barber_name} - {formatBookingTime(item.starts_at)}</Text><Text style={styles.meta}>{item.price_dzd} دج - {item.status}</Text>{item.status === 'booked' ? <Pressable accessibilityRole="button" accessibilityLabel="إلغاء الموعد" onPress={() => void cancel(item.id)}><Text style={styles.cancel}>إلغاء الموعد</Text></Pressable> : null}</View>)}</View></Screen>;
}
const styles = StyleSheet.create({ content: { flex: 1, gap: spacing.md }, title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title, textAlign: 'right' }, card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: radii.lg, padding: spacing.md, gap: spacing.xs }, name: { color: colors.charcoal, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.label, textAlign: 'right' }, meta: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, textAlign: 'right' }, cancel: { color: colors.danger, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body, textAlign: 'right' }, muted: { color: colors.muted, fontFamily: typography.fontFamily.regular, textAlign: 'center' }, error: { color: colors.danger, fontFamily: typography.fontFamily.regular, textAlign: 'right' } });
