import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  appointmentStatusLabel,
  canCancelCustomerAppointment,
  canRescheduleCustomerAppointment,
  formatBookingTime,
  formatAppointmentWhen,
  type Appointment,
} from '@/src/booking';
import { Avatar, Button, Card, Chip, CustomerStageHeader, EmptyState, ErrorBanner, Icon, Screen } from '@/src/components/ui';
import { deriveRecentBarbers } from '@/src/customerHome';
import { CustomerHomeSkeleton } from '@/src/features/customer-home/CustomerHomeSkeleton';
import { RecentBarbers } from '@/src/features/customer-home/RecentBarbers';
import { loadCustomerAppointments, useBooking } from '@/src/hooks/useBooking';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, layout, space, typography } from '@/src/theme';
import { initialsFromName } from '@/src/utils/initials';

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
    if (!upcoming) return;
    if (!canCancelCustomerAppointment(upcoming.starts_at)) {
      setError(new Error(t('errors.CANCEL_NOT_ALLOWED')));
      return;
    }
    Alert.alert(t('home.cancelAppt'), t('home.cancelConfirm'), [
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
        title={`${t('home.greeting')}${profile?.name ? `، ${profile.name}` : ''}`}
        subtitle={upcoming ? t('home.upcomingSubtitle') : t('home.startBookingSubtitle')}
      />

      <View style={styles.body}>
        {legalError ? (
          <View style={styles.initialError}>
            <ErrorBanner error={legalError} />
            <Button label={t('common.retry')} variant="secondary" onPress={() => void retryLegalAcceptance()} />
          </View>
        ) : null}
        <ErrorBanner error={dataError} />
        {loading ? <CustomerHomeSkeleton /> : showInitialError ? (
          <View style={styles.initialError}>
            <Button
              label={t('home.retryAppointments')}
              variant="secondary"
              onPress={() => void refresh()}
            />
          </View>
        ) : upcoming ? (
          <Card elevated style={styles.card}>
            <View style={styles.cardTop}>
              <Chip label={appointmentStatusLabel(upcoming.status)} tone="accent" />
              <Text style={styles.meta}>{formatAppointmentWhen(upcoming.starts_at)}</Text>
            </View>
            <Text style={styles.service}>{upcoming.service_name}</Text>
            <View style={styles.person}>
              <Avatar initials={initialsFromName(upcoming.barber_name ?? 'ح')} />
              <View style={styles.personCopy}>
                <Text style={styles.personName}>{upcoming.barber_name ?? '—'}</Text>
              </View>
            </View>
            <View style={styles.chips}>
              <Chip label={formatBookingTime(upcoming.starts_at)} />
              <Chip label={`${upcoming.price_dzd.toLocaleString('ar-DZ')} ${t('common.dzd')}`} />
            </View>
            <Button
              label={t('home.manage')}
              onPress={() => router.push(`/appointment/${upcoming.id}`)}
            />
            <View style={styles.links}>
              {upcoming.status === 'booked' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('home.scanQr')}
                  style={styles.linkRow}
                  onPress={() => router.push({
                    pathname: '/scan',
                    params: {
                      appointmentId: upcoming.id,
                      barberName: upcoming.barber_name,
                      startsAt: upcoming.starts_at,
                    },
                  })}
                >
                  <Icon name="qr-code-outline" size={16} color={colors.primary} />
                  <Text style={styles.link}>{t('home.scanQr')}</Text>
                </Pressable>
              ) : null}
              {canRescheduleCustomerAppointment(upcoming.status) ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('home.reschedule')}
                  style={styles.linkRow}
                  onPress={() => router.push(`/book/${upcoming.barber_id}?appointmentId=${upcoming.id}&serviceId=${upcoming.service_id}`)}
                >
                  <Icon name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={styles.link}>{t('home.reschedule')}</Text>
                </Pressable>
              ) : null}
              {canCancelCustomerAppointment(upcoming.starts_at) ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('home.cancelAppt')}
                  style={styles.linkRow}
                  onPress={cancel}
                >
                  <Icon name="close-circle-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.linkMuted}>{t('home.cancelAppt')}</Text>
                </Pressable>
              ) : null}
            </View>
          </Card>
        ) : (
          <Card elevated>
            <EmptyState
              title={t('home.findCta')}
              body={t('home.findBody')}
              actionLabel={t('home.findCta')}
              onAction={() => router.push('/(customer)/find')}
            />
          </Card>
        )}
        {!loading && !showInitialError && recentBarbers.length ? (
          <RecentBarbers
            items={recentBarbers}
            onSelect={(barberId) => router.push(`/barber/${barberId}`)}
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
  card: {
    gap: space[3],
  },
  cardTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: {
    ...typography.caption,
  },
  service: {
    ...typography.title,
    textAlign: 'right',
  },
  person: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[3],
  },
  personCopy: {
    flex: 1,
    alignItems: 'flex-end',
  },
  personName: {
    ...typography.bodyStrong,
  },
  chips: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: space[2],
  },
  links: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: space[3],
    justifyContent: 'center',
  },
  linkRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[1],
  },
  link: {
    ...typography.label,
    color: colors.primary,
  },
  linkMuted: {
    ...typography.label,
    color: colors.textMuted,
  },
});
