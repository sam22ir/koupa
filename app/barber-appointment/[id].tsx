import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { formatBookingTime, type BarberAppointmentEvent } from '@/src/booking';
import {
  AppointmentStatusBadge,
  Avatar,
  BackButton,
  Button,
  Card,
  CustomerStageHeader,
  DetailList,
  ErrorBanner,
  Screen,
} from '@/src/components/ui';
import { initialsFromName } from '@/src/utils/initials';
import { loadBarberAppointment } from '@/src/hooks/useBooking';
import { t } from '@/src/i18n';
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
      <CustomerStageHeader
        title="تفاصيل الموعد"
        context={t('auth.roleBarber')}
        trailing={<BackButton fallback="/(barber)/today" />}
      />
      <View style={styles.body}>
        {loading ? <ActivityIndicator color={colors.primary} size="large" /> : null}
        <ErrorBanner error={error} />
        {!loading && item ? (
          <Card elevated style={styles.card}>
            <View style={styles.person}>
              <Avatar initials={initialsFromName(item.customer_name)} size={52} />
              <View style={styles.personCopy}>
                <Text style={styles.name}>{item.customer_name}</Text>
                <Text selectable style={styles.copy}>{item.customer_phone}</Text>
              </View>
              <AppointmentStatusBadge status={item.status} />
            </View>
            <View style={styles.details}>
              <DetailList
                rows={[
                  { label: t('common.service'), value: item.service_name },
                  { label: t('common.time'), value: formatBookingTime(item.starts_at) },
                ]}
              />
            </View>
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
  card: { gap: space[4] },
  person: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[3] },
  personCopy: { flex: 1, minWidth: 0, alignItems: 'flex-end', gap: 2 },
  details: { borderTopWidth: 1, borderTopColor: colors.borderSubtle, paddingTop: space[4] },
  name: { ...typography.titleSm, textAlign: 'right' },
  copy: { ...typography.caption, textAlign: 'right' },
});
