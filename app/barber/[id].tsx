import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import type { BarberProfile } from '@/src/booking';
import { Avatar, Button, Card, Chip, CustomerStageHeader, ErrorBanner, Screen } from '@/src/components/ui';
import { useBooking } from '@/src/hooks/useBooking';
import { t } from '@/src/i18n';
import { colors, space, typography } from '@/src/theme';
import { initialsFromName } from '@/src/utils/initials';

export default function BarberProfilePublicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getBarber, loading, error } = useBooking();
  const [barber, setBarber] = useState<BarberProfile | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    void getBarber(id).then((rows) => {
      if (active) setBarber(rows?.[0] ?? null);
    });
    return () => {
      active = false;
    };
  }, [getBarber, id]);

  return (
    <Screen padded={false} scroll>
      <CustomerStageHeader
        title={barber?.name ?? t('booking.chooseBarber')}
        subtitle={barber ? [barber.neighborhood, barber.city].filter(Boolean).join('، ') : undefined}
      />
      <View style={styles.body}>
      {loading && !barber ? <Text style={styles.loading}>{t('common.loading')}</Text> : null}
      <ErrorBanner error={error} />
      {barber ? (
        <>
          <View style={styles.header}>
            <Avatar initials={initialsFromName(barber.name)} size={64} />
          </View>
          <Text style={styles.meta}>
            ★ {barber.average_rating.toFixed(1)} ({barber.rating_count})
          </Text>
          {barber.bio ? <Text style={styles.bio}>{barber.bio}</Text> : null}
          <Text style={styles.section}>{t('booking.services')}</Text>
          {barber.services.map((service) => (
            <Card key={service.id} style={styles.service}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <View style={styles.chips}>
                <Chip label={`${service.price_dzd} ${t('common.dzd')}`} />
                <Chip label={`${service.duration_minutes} ${t('common.minutes')}`} />
              </View>
            </Card>
          ))}
          {barber.maps_url ? (
            <Button
              label="الموقع"
              variant="secondary"
              onPress={() => void Linking.openURL(barber.maps_url!)}
            />
          ) : null}
          <Button label={t('booking.book')} onPress={() => router.push(`/book/${barber.id}`)} />
        </>
      ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: space[5],
    gap: space[3],
  },
  loading: {
    ...typography.caption,
    textAlign: 'right',
  },
  header: {
    flexDirection: 'row-reverse',
    gap: space[3],
    alignItems: 'center',
  },
  meta: {
    ...typography.caption,
    textAlign: 'right',
  },
  bio: {
    ...typography.body,
    textAlign: 'right',
    color: colors.textMuted,
  },
  section: {
    ...typography.titleSm,
    textAlign: 'right',
  },
  service: {
    gap: space[2],
    marginBottom: space[2],
  },
  serviceName: {
    ...typography.bodyStrong,
    textAlign: 'right',
  },
  chips: {
    flexDirection: 'row-reverse',
    gap: space[2],
  },
});
