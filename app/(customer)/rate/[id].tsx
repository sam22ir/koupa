import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PrimaryButton } from '@/src/components/atoms/PrimaryButton';
import { ScreenHeader } from '@/src/components/molecules/ScreenHeader';
import { Screen } from '@/src/components/organisms/Screen';
import { formatAppointmentWhen, type Appointment } from '@/src/booking';
import { copy } from '@/src/data/copy';
import { loadCustomerAppointments, useBooking } from '@/src/hooks/useBooking';
import { canEditRating, canRateAppointment, isValidStarRating } from '@/src/ratings';
import { colors, spacing, typography } from '@/src/theme';

export default function RateAppointmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loading, error, rateAppointment } = useBooking();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [stars, setStars] = useState(0);
  const [done, setDone] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!id) return;
    void loadCustomerAppointments()
      .then((items) => {
        const current = items.find((item) => item.id === id) ?? null;
        setAppointment(current);
        setStars(current?.rating?.stars ?? 0);
      })
      .catch(() => undefined);
  }, [id]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(customer)/appointments');
  };

  const canSubmit =
    appointment &&
    isValidStarRating(stars) &&
    (canRateAppointment(appointment.status, appointment.rating) || canEditRating(appointment.rating));

  const submit = async () => {
    if (!appointment || !canSubmit) {
      setLocalError(copy.common.validation);
      return;
    }
    setLocalError('');
    const result = await rateAppointment(appointment.id, stars);
    if (result) setDone(true);
  };

  const locked =
    appointment &&
    appointment.status === 'completed' &&
    appointment.rating &&
    !canEditRating(appointment.rating);

  return (
    <Screen>
      <ScreenHeader onBack={goBack} />
      <Text style={styles.title}>{copy.customer.rateTitle}</Text>
      {appointment ? (
        <>
          <Text style={styles.meta}>{appointment.service_name}</Text>
          <Text style={styles.meta}>{appointment.barber_name}</Text>
          <Text style={styles.meta}>{formatAppointmentWhen(appointment.starts_at)}</Text>
        </>
      ) : null}

      {done ? (
        <View style={styles.successBox}>
          <Text style={styles.success}>{copy.customer.rateSaved}</Text>
          <PrimaryButton label={copy.customer.appointmentsTitle} onPress={() => router.replace('/(customer)/appointments')} />
        </View>
      ) : (
        <>
          <Text style={styles.body}>{copy.customer.rateBody}</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`${value}`}
                accessibilityState={{ selected: stars === value }}
                disabled={Boolean(locked)}
                onPress={() => {
                  setStars(value);
                  setLocalError('');
                }}
              >
                <MaterialCommunityIcons
                  name={stars >= value ? 'star' : 'star-outline'}
                  size={36}
                  color={stars >= value ? colors.gold : colors.outline}
                />
              </Pressable>
            ))}
          </View>
          {locked ? <Text style={styles.muted}>{copy.customer.ratingClosed}</Text> : null}
          {localError || error ? <Text style={styles.error}>{localError || error}</Text> : null}
          {!locked ? (
            <PrimaryButton label={copy.customer.rateSubmit} disabled={!isValidStarRating(stars)} loading={loading} onPress={() => void submit()} />
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title, textAlign: 'right' },
  body: {
    color: colors.muted,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    lineHeight: typography.line.body,
    textAlign: 'right',
  },
  meta: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, textAlign: 'right' },
  stars: { flexDirection: 'row-reverse', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  successBox: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  success: { color: colors.primary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title, textAlign: 'center' },
  muted: { color: colors.muted, fontFamily: typography.fontFamily.regular, textAlign: 'right' },
  error: { color: colors.danger, fontFamily: typography.fontFamily.regular, textAlign: 'right' },
});
