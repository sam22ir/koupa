import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert as RNAlert, StyleSheet, View } from 'react-native';
import { Alert } from 'heroui-native/alert';
import { Button } from 'heroui-native/button';
import { Card } from 'heroui-native/card';
import { Typography } from 'heroui-native/text';

import {
  canCancelCustomerAppointment,
  type Appointment,
} from '@/src/booking';
import { CustomerStageHeader, Screen } from '@/src/components/ui';
import { deriveRecentBarbers } from '@/src/customerHome';
import { CustomerHomeSkeleton } from '@/src/features/customer-home/CustomerHomeSkeleton';
import { RecentBarbers } from '@/src/features/customer-home/RecentBarbers';
import { UpcomingAppointmentCard } from '@/src/features/customer-home/UpcomingAppointmentCard';
import { loadCustomerAppointments, useBooking } from '@/src/hooks/useBooking';
import { t } from '@/src/i18n';
import { formatAppError } from '@/src/i18n/errors';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, layout, space } from '@/src/theme';

function ErrorAlert({ error }: { readonly error: unknown }) {
  if (!error) return null;
  return (
    <Alert status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{formatAppError(error)}</Alert.Title>
      </Alert.Content>
    </Alert>
  );
}

export default function CustomerHomeScreen() {
  const { profile, legalError, retryLegalAcceptance } = useAppSession();
  const booking = useBooking();
  const [appointments, setAppointments] = useState<readonly Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [hasLoadedSuccessfully, setHasLoadedSuccessfully] = useState(false);

  const upcoming = useMemo(
    () => appointments.find((item) => item.status === 'booked' || item.status === 'present') ?? null,
    [appointments],
  );
  const recentBarbers = useMemo(() => deriveRecentBarbers(appointments), [appointments]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await loadCustomerAppointments();
      setAppointments(items);
      setHasLoadedSuccessfully(true);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, []);

  const dataError = error || booking.error;
  const showInitialError = !loading && Boolean(dataError) && !hasLoadedSuccessfully;

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const cancel = () => {
    if (!upcoming || upcoming.status !== 'booked') return;
    if (!canCancelCustomerAppointment(upcoming.starts_at)) {
      setError(new Error(t('errors.CANCEL_NOT_ALLOWED')));
      return;
    }
    RNAlert.alert(t('home.cancelAppt'), t('home.cancelConfirm'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('common.yes'),
        style: 'destructive',
        onPress: () => {
          void booking.cancelCustomer(upcoming.id).then((ok) => {
            if (ok !== false) void refresh();
          });
        },
      },
    ]);
  };

  return (
    <Screen padded={false} scroll>
      <CustomerStageHeader
        tone="stage"
        title={`${t('home.greeting')}${profile?.name ? `، ${profile.name}` : ''}`}
        subtitle={upcoming ? t('home.upcomingSubtitle') : t('home.startBookingSubtitle')}
      />

      <View style={styles.body}>
        {legalError ? (
          <View style={styles.initialError}>
            <ErrorAlert error={legalError} />
            <Button variant="secondary" onPress={() => void retryLegalAcceptance()}>
              <Button.Label>{t('common.retry')}</Button.Label>
            </Button>
          </View>
        ) : null}
        {dataError && (!hasLoadedSuccessfully || !upcoming) ? <ErrorAlert error={dataError} /> : null}
        {dataError && hasLoadedSuccessfully && upcoming ? (
          <View style={styles.refreshNotice}>
            <Typography type="body-xs" color="muted" align="end" className="flex-1">
              {t('home.refreshFailed')}
            </Typography>
            <Button variant="ghost" onPress={() => void refresh()}>
              <Button.Label>{t('common.retry')}</Button.Label>
            </Button>
          </View>
        ) : null}
        {loading ? <CustomerHomeSkeleton /> : showInitialError ? (
          <View style={styles.initialError}>
            <Button variant="secondary" onPress={() => void refresh()}>
              <Button.Label>{t('home.retryAppointments')}</Button.Label>
            </Button>
          </View>
        ) : upcoming ? (
          <View style={styles.upcomingSection}>
            <Typography type="body" weight="semibold" color="muted" align="end">
              {t('home.nextAppointment')}
            </Typography>
            <UpcomingAppointmentCard
              appointment={upcoming}
              onManage={() => router.push(`/appointment/${upcoming.id}`)}
              onScan={() => router.push({
                pathname: '/scan',
                params: { appointmentId: upcoming.id, barberName: upcoming.barber_name, startsAt: upcoming.starts_at },
              })}
              onReschedule={() => router.push(`/book/${upcoming.barber_id}?appointmentId=${upcoming.id}&serviceId=${upcoming.service_id}&returnTo=${encodeURIComponent(`/appointment/${upcoming.id}`)}`)}
              onCancel={cancel}
            />
          </View>
        ) : (
          <Card className="p-6 items-center gap-3">
            <Typography type="h5" align="center">
              {t('home.noAppointment')}
            </Typography>
            <Typography type="body" color="muted" align="center">
              {t('home.findBody')}
            </Typography>
            <Button onPress={() => router.push('/(customer)/find')}>
              <Button.Label>{t('home.findCta')}</Button.Label>
            </Button>
          </Card>
        )}
        {!loading && !showInitialError && recentBarbers.length ? (
          <RecentBarbers
            items={recentBarbers}
            onSelect={(barberId) => router.push({ pathname: '/barber/[id]', params: { id: barberId, returnTo: '/home' } })}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: layout.stageBodyOverlap,
    paddingHorizontal: layout.screenPaddingX,
    gap: space[3],
    paddingBottom: space[6],
  },
  initialError: { gap: space[3] },
  upcomingSection: { gap: space[2] },
  refreshNotice: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: space[2], paddingHorizontal: space[2], paddingVertical: space[1], borderRadius: 8, backgroundColor: colors.accentSoft },
});