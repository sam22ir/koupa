import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { appointmentStatusLabel, formatBookingTime, type BarberAppointmentEvent } from '@/src/booking';
import { BackButton, Button, Card, CustomerStageHeader, ErrorBanner, Screen } from '@/src/components/ui';
import { loadBarberAppointment } from '@/src/hooks/useBooking';
import { colors, space, typography } from '@/src/theme';

export default function BarberAppointmentEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<BarberAppointmentEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setItem(await loadBarberAppointment(id));
    } catch (caught) {
      setError(caught);
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  return (
    <Screen padded={false}>
      <CustomerStageHeader title="تفاصيل الموعد" trailing={<BackButton fallback="/(barber)/today" />} />
      <View style={styles.body}>
        {loading ? <ActivityIndicator color={colors.primary} size="large" /> : null}
        <ErrorBanner error={error} />
        {!loading && item ? (
          <Card style={styles.card}>
            <Text style={styles.name}>{item.customer_name}</Text>
            <Text style={styles.copy}>{item.customer_phone}</Text>
            <Text style={styles.name}>{item.service_name}</Text>
            <Text style={styles.copy}>{formatBookingTime(item.starts_at)}</Text>
            <Text style={styles.status}>{appointmentStatusLabel(item.status)}</Text>
          </Card>
        ) : null}
        {!loading && !item && !error ? <Text style={styles.copy}>تعذر العثور على الموعد.</Text> : null}
        {!loading ? <Button label="العودة إلى اليوم" variant="secondary" onPress={() => router.dismissTo('/(barber)/today')} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: space[5], gap: space[4] },
  card: { gap: space[2] },
  name: { ...typography.bodyStrong, textAlign: 'right' },
  copy: { ...typography.body, color: colors.textMuted, textAlign: 'right' },
  status: { ...typography.titleSm, color: colors.primary, textAlign: 'right' },
});
