import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert as RNAlert, StyleSheet, Text, View } from 'react-native';
import { Alert } from 'heroui-native/alert';
import { Button } from 'heroui-native/button';
import { Card } from 'heroui-native/card';
import { Typography } from 'heroui-native/text';

import {
  canCancelCustomerAppointment,
  type Appointment,
} from '@/src/booking';
import {
  BrandLogo,
  Button as KoupaButton,
  EmptyState,
  Screen,
  Stage,
} from '@/src/components/ui';
import { RoleHomeHeader } from '@/src/components/ui/RoleHomeHeader';
import { deriveRecentBarbers } from '@/src/customerHome';
import { CustomerHomeSkeleton } from '@/src/features/customer-home/CustomerHomeSkeleton';
import { RecentBarbers } from '@/src/features/customer-home/RecentBarbers';
import { UpcomingAppointmentCard } from '@/src/features/customer-home/UpcomingAppointmentCard';
import { loadCustomerAppointments, useBooking } from '@/src/hooks/useBooking';
import { t } from '@/src/i18n';
import { formatAppError } from '@/src/i18n/errors';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, elevation, layout, space, typography } from '@/src/theme';

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
  const { guestBrowsing } = useAppSession();
  return guestBrowsing ? <GuestHome /> : <SignedInHome />;
}

/** Signed-out visitors: discovery first, account only when they book. */
function GuestHome() {
  return (
    <Screen padded={false} scroll bleedTop style={styles.screen}>
      <Stage>
        <BrandLogo height={30} imageStyle={{ tintColor: colors.onPrimary }} />
        <View style={styles.guestCopy}>
          <Text style={styles.guestGreeting}>{t('home.greeting')}</Text>
          <Text accessibilityRole="header" style={styles.guestTitle}>{t('home.guestTitle')}</Text>
          <Text style={styles.guestBody}>{t('home.guestBody')}</Text>
        </View>
        <KoupaButton
          testID="guest-find-cta"
          variant="onStage"
          label={t('home.guestFindCta')}
          onPress={() => router.push('/(customer)/find')}
        />
      </Stage>
      <View style={[styles.body, styles.lifted]}>
        <Card className="p-4 gap-2" style={elevation.float}>
          <Typography type="body" color="muted" align="center">{t('home.guestSignInHint')}</Typography>
          <KoupaButton
            testID="guest-sign-in"
            variant="secondary"
            label={t('auth.signIn')}
            onPress={() => router.push('/(auth)/sign-in')}
          />
          <KoupaButton
            testID="guest-create-account"
            variant="ghost"
            label={t('auth.createAccount')}
            onPress={() => router.push({ pathname: '/(auth)/sign-up', params: { role: 'customer' } })}
          />
        </Card>
      </View>
    </Screen>
  );
}

function SignedInHome() {
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
    <Screen padded={false} scroll bleedTop style={styles.screen}>
      <RoleHomeHeader
        overlap
        greeting={t('home.greeting')}
        name={profile?.name ?? t('profile.accountNameFallback')}
        profileLabel={t('tabs.profile')}
        notificationsLabel={t('profile.notifications')}
        onProfile={() => router.push('/(customer)/profile')}
        onNotifications={() => router.push('/notifications')}
      />
      <View style={[styles.body, styles.lifted]}>
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
          <Card className="p-2" style={elevation.float}>
            <EmptyState
              icon="calendar-outline"
              title={t('home.noAppointment')}
              body={t('home.findBody')}
              actionLabel={t('home.findCta')}
              onAction={() => router.push('/(customer)/find')}
            />
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
  screen: { backgroundColor: colors.background },
  body: {
    paddingHorizontal: layout.screenPaddingX,
    gap: space[5],
    paddingBottom: space[6],
  },
  lifted: { marginTop: layout.stageBodyOverlap },
  guestCopy: { gap: space[1], marginTop: space[5], marginBottom: space[4], alignItems: 'flex-end' },
  guestGreeting: { ...typography.label, color: colors.onPrimaryMuted, textAlign: 'right' },
  guestTitle: { ...typography.display, color: colors.onPrimary, textAlign: 'right' },
  guestBody: { ...typography.body, color: colors.onPrimaryMuted, textAlign: 'right' },
  initialError: { gap: space[3] },
  upcomingSection: { gap: space[2] },
  refreshNotice: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: space[2], paddingHorizontal: space[3], paddingVertical: space[1], borderRadius: 12, backgroundColor: colors.warningSoft },
});
