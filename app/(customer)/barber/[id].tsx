import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PrimaryButton } from '@/src/components/atoms/PrimaryButton';
import { ScreenHeader } from '@/src/components/molecules/ScreenHeader';
import { Screen } from '@/src/components/organisms/Screen';
import type { BarberProfile } from '@/src/booking';
import { useBooking } from '@/src/hooks/useBooking';
import { ratingSummaryLabel } from '@/src/ratings';
import { colors, radii, spacing, typography } from '@/src/theme';

export default function BarberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loading, error, getBarber } = useBooking();
  const [barber, setBarber] = useState<BarberProfile | null>(null);

  useEffect(() => {
    if (id) void getBarber(id).then((rows) => setBarber(rows?.[0] ?? null));
  }, [getBarber, id]);

  return (
    <Screen>
      <ScreenHeader onBack={() => router.back()} />
      {loading ? <Text style={styles.muted}>جارٍ التحميل...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {barber ? (
        <>
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="content-cut" size={36} color={colors.primary} />
            </View>
            <Text style={styles.name}>{barber.name}</Text>
            <Text style={styles.meta}>{[barber.city, barber.neighborhood].filter(Boolean).join(' - ')}</Text>
            <Text style={styles.rating}>{ratingSummaryLabel(barber.average_rating ?? 0, barber.rating_count ?? 0)}</Text>
            {barber.bio ? <Text style={styles.bio}>{barber.bio}</Text> : null}
          </View>
          <View style={styles.section}>
            <Text style={styles.heading}>الخدمات</Text>
            {barber.services.map((service) => (
              <View key={service.id} style={styles.service}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.meta}>
                  {service.price_dzd} دج - {service.duration_minutes} دقيقة
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.section}>
            <Text style={styles.heading}>الموقع والتواصل</Text>
            <Text style={styles.meta}>{barber.phone}</Text>
            {barber.maps_url ? (
              <Text selectable style={styles.meta}>
                {barber.maps_url}
              </Text>
            ) : null}
          </View>
          <PrimaryButton
            label="احجز موعداً"
            onPress={() => router.push({ pathname: '/(customer)/booking/[id]', params: { id: barber.id } })}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title },
  meta: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, textAlign: 'right' },
  rating: { color: colors.gold, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body },
  bio: { color: colors.charcoal, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, textAlign: 'center' },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.outlineVariant,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  heading: { color: colors.charcoal, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.label, textAlign: 'right' },
  service: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: spacing.sm },
  serviceName: { color: colors.charcoal, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body },
  muted: { color: colors.muted, fontFamily: typography.fontFamily.regular, textAlign: 'center' },
  error: { color: colors.danger, fontFamily: typography.fontFamily.regular, textAlign: 'right' },
});
