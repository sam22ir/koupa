import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  appointmentStatusLabel,
  canCancelCustomerAppointment,
  canRescheduleCustomerAppointment,
  formatBookingTime,
  formatAppointmentWhen,
  type Appointment,
} from '@/src/booking';
import { Avatar, BrandLogo, Button, Card, Chip, EmptyState, ErrorBanner, Icon, Screen, Stage } from '@/src/components/ui';
import { loadCustomerAppointments, useBooking } from '@/src/hooks/useBooking';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, layout, space, typography } from '@/src/theme';
import { initialsFromName } from '@/src/utils/initials';

export default function CustomerHomeScreen() {
  const { profile } = useAppSession();
  const booking = useBooking();
  const [upcoming, setUpcoming] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await loadCustomerAppointments();
      const next =
        items.find((item) => item.status === 'booked' || item.status === 'present') ?? null;
      setUpcoming(next);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, []);

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
    <Screen padded={false} loading={loading}>
      <Stage>
        <View style={styles.stageTop}>
          <BrandLogo variant="mark" height={40} />
          <View style={styles.brandBlock}>
            <Text style={styles.tagline}>{t('brandTagline')}</Text>
          </View>
        </View>
        <View style={styles.goldBar} />
        <Text style={styles.greeting}>
          {t('home.greeting')}
          {profile?.name ? `، ${profile.name}` : ''}
        </Text>
        <Text style={styles.stageSub}>
          {upcoming ? t('home.nextReady') : t('home.noAppointment')}
        </Text>
      </Stage>

      <View style={styles.body}>
        <ErrorBanner error={error || booking.error} />
        {upcoming ? (
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
                  style={styles.linkRow}
                  onPress={() => router.push(`/book/${upcoming.barber_id}?appointmentId=${upcoming.id}&serviceId=${upcoming.service_id}`)}
                >
                  <Icon name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={styles.link}>{t('home.reschedule')}</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.linkRow} onPress={cancel}>
                <Icon name="close-circle-outline" size={16} color={colors.textMuted} />
                <Text style={styles.linkMuted}>{t('home.cancelAppt')}</Text>
              </Pressable>
            </View>
          </Card>
        ) : (
          <Card elevated>
            <EmptyState
              title={t('home.noAppointment')}
              body={t('home.findCta')}
              actionLabel={t('home.findCta')}
              onAction={() => router.push('/(customer)/find')}
            />
          </Card>
        )}

        <View style={styles.tiles}>
          <Pressable style={styles.tile} onPress={() => router.push('/(customer)/find')}>
            <Icon name="search" size={20} color={colors.primary} />
            <Text style={styles.tileTitle}>{t('home.discover')}</Text>
          </Pressable>
          <Pressable style={styles.tile} onPress={() => router.push('/(customer)/appointments')}>
            <Icon name="calendar" size={20} color={colors.accent} />
            <Text style={styles.tileTitle}>{t('home.myAppointments')}</Text>
          </Pressable>
        </View>

        <Pressable style={styles.search} onPress={() => router.push('/(customer)/find')}>
          <Icon name="search-outline" size={18} color={colors.textMuted} />
          <Text style={styles.searchText}>{t('home.searchPlaceholder')}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stageTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandBlock: {
    alignItems: 'flex-end',
    flex: 1,
    marginHorizontal: space[3],
    gap: space[1],
  },
  tagline: {
    ...typography.caption,
    color: colors.onPrimaryMuted,
  },
  goldBar: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignSelf: 'flex-end',
    marginTop: space[5],
  },
  greeting: {
    ...typography.display,
    color: colors.onPrimary,
    textAlign: 'right',
  },
  stageSub: {
    ...typography.body,
    color: colors.onPrimaryMuted,
    textAlign: 'right',
  },
  body: {
    marginTop: layout.stageBodyOverlap,
    paddingHorizontal: layout.screenPaddingX,
    gap: space[3],
    paddingBottom: space[6],
  },
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
  tiles: {
    flexDirection: 'row-reverse',
    gap: space[3],
  },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[4],
    alignItems: 'flex-end',
    gap: space[2],
  },
  tileTitle: {
    ...typography.bodyStrong,
  },
  search: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[4],
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[2],
  },
  searchText: {
    ...typography.caption,
    flex: 1,
    textAlign: 'right',
  },
});
