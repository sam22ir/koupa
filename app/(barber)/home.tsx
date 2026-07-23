import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/src/components/organisms/Screen';
import { formatBookingTime, type TodayAppointment } from '@/src/booking';
import { useBooking } from '@/src/hooks/useBooking';
import { colors, spacing, typography } from '@/src/theme';

export default function BarberHome() {
  const { loading, error, today, markPresent, cancelBarber } = useBooking(); const [appointments, setAppointments] = useState<readonly TodayAppointment[]>([]);
  const load = useCallback(() => { void today().then((items) => { if (items) setAppointments(items); }); }, [today]); useEffect(load, [load]);
  const present = async (id: string) => { const result = await markPresent(id); if (result) load(); };
  const cancel = async (id: string) => { if (await cancelBarber(id)) load(); };
  return <Screen><Text style={styles.title}>مواعيد اليوم</Text>{loading ? <Text style={styles.body}>جارٍ التحميل...</Text> : null}{error ? <Text style={styles.error}>{error}</Text> : null}{!loading && !appointments.length ? <View style={styles.content}><Text style={styles.body}>لا توجد مواعيد اليوم.</Text></View> : appointments.map((item) => <View key={item.id} style={styles.card}><Text style={styles.name}>{item.customer_name}</Text><Text selectable style={styles.body}>{item.customer_phone}</Text><Text style={styles.body}>{item.service_name} - {formatBookingTime(item.starts_at)} - {item.price_dzd} دج</Text><Text style={styles.body}>{item.status}</Text>{item.status === 'booked' ? <View style={styles.actions}><Pressable accessibilityRole="button" accessibilityLabel="تأكيد الحضور" onPress={() => void present(item.id)}><Text style={styles.present}>تأكيد الحضور</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="إلغاء الموعد" onPress={() => void cancel(item.id)}><Text style={styles.cancel}>إلغاء</Text></Pressable></View> : null}</View>)}</Screen>;
}

const styles = StyleSheet.create({ content: { flex: 1, justifyContent: 'center', gap: spacing.sm }, title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title, lineHeight: typography.line.title, textAlign: 'right' }, card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 8, padding: spacing.md, gap: spacing.xs }, name: { color: colors.charcoal, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.label, textAlign: 'right' }, body: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, lineHeight: typography.line.body, textAlign: 'right' }, actions: { flexDirection: 'row-reverse', gap: spacing.lg }, present: { color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body }, cancel: { color: colors.danger, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body }, error: { color: colors.danger, fontFamily: typography.fontFamily.regular, textAlign: 'right' } });
