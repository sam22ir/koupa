import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  formatBookingTime,
  type TodayAppointment,
} from '@/src/booking';
import {
  loadBarberPublishReadiness,
  publishExistingBarberProfile,
  type BarberPublishReadiness,
} from '@/src/services/onboarding';
import {
  getCustomerInitials,
  getTodayDashboard,
  getTodayDurationMinutes,
} from '@/src/barberToday';
import {
  AppointmentStatusBadge,
  Avatar,
  Button,
  EmptyState,
  ErrorBanner,
  Icon,
  Screen,
  BrandLogo,
} from '@/src/components/ui';
import { RoleHomeHeader } from '@/src/components/ui/RoleHomeHeader';
import { QrCodeMatrix } from '@/src/components/QrCodeMatrix';
import { useBooking } from '@/src/hooks/useBooking';
import { t } from '@/src/i18n';
import {
  clearBarberOnboardingHints,
  readBarberOnboardingHints,
  type BarberActivationWorkplace,
} from '@/src/navigation/barberActivation';
import { buildBarberCheckInPayload } from '@/src/qr';
import { EmailConfirmationRow, needsEmailConfirmation } from '@/src/features/barber-activation/EmailConfirmationRow';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, elevation, layout, radii, space, typography } from '@/src/theme';

const todayFormatter = new Intl.DateTimeFormat('ar-DZ', {
  timeZone: 'Africa/Algiers',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function Counter({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <View
      style={styles.counter}
      accessible
      accessibilityLabel={`${label}، ${value}`}
    >
      <Text style={styles.counterValue}>{value.toLocaleString('ar-DZ')}</Text>
      <Text style={styles.counterLabel}>{label}</Text>
    </View>
  );
}

export default function BarberTodayScreen() {
  const { profile, legalError, retryLegalAcceptance, refreshProfile, session, emailConfirmed } = useAppSession();
  const emailPending = needsEmailConfirmation({ hasSession: Boolean(session), emailConfirmed: Boolean(emailConfirmed) });
  const { today, markPresent, cancelBarber, undoQrCheckIn, error } = useBooking();
  const [items, setItems] = useState<readonly TodayAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<TodayAppointment | null>(null);
  const [sharingQr, setSharingQr] = useState(false);
  const [activationWorkplace, setActivationWorkplace] = useState<BarberActivationWorkplace | null>(null);
  const [readiness, setReadiness] = useState<BarberPublishReadiness | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<unknown>(null);
  const profileId = profile?.id;
  const isUnpublished = Boolean(profile && profile.role === 'barber' && !profile.is_published);
  const qrCardRef = useRef<View | null>(null);

  const dashboard = useMemo(() => getTodayDashboard(items), [items]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await today();
      setItems(next ?? []);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void readBarberOnboardingHints().then(setActivationWorkplace);
      // Re-read on focus so finishing services or hours in the Schedule tab
      // ticks the checklist off as soon as the barber comes back. Depend on the
      // id rather than the profile object, which is not identity-stable.
      if (isUnpublished && profileId) {
        void loadBarberPublishReadiness(profileId).then(setReadiness).catch(() => setReadiness(null));
      }
    }, [isUnpublished, profileId, refresh]),
  );

  const publishProfile = async () => {
    setPublishing(true);
    setPublishError(null);
    try {
      await publishExistingBarberProfile();
      await refreshProfile();
    } catch (caught) {
      setPublishError(caught);
    } finally {
      setPublishing(false);
    }
  };

  const dismissActivationTips = async () => {
    await clearBarberOnboardingHints();
    setActivationWorkplace(null);
  };

  const onMarkPresent = async (id: string) => {
    if (pendingId) return;
    setPendingId(id);
    try {
      const result = await markPresent(id);
      if (result) await refresh();
    } finally {
      setPendingId(null);
    }
  };

  const onCancel = (item: TodayAppointment) => {
    Alert.alert(t('home.cancelAppt'), t('home.cancelConfirm'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('common.yes'),
        style: 'destructive',
        onPress: () => {
          setPendingId(item.id);
          void cancelBarber(item.id)
            .then((ok) => {
              if (ok !== false) {
                setSelectedAppointment(null);
                return refresh();
              }
              return undefined;
            })
            .finally(() => setPendingId(null));
        },
      },
    ]);
  };

  const showQr = () => {
    if (!profile?.id) return;
    setQrPayload(buildBarberCheckInPayload(profile.id));
  };

  const shareQr = async () => {
    if (!qrCardRef.current || sharingQr) return;
    setSharingQr(true);
    try {
      if (!(await Sharing.isAvailableAsync()) || Constants.appOwnership === 'expo') {
        Alert.alert(t('barber.shareUnavailable'));
        return;
      }

      // Expo Go does not guarantee the optional RNViewShot native module.
      // Keep it out of startup evaluation; a development build can still share.
      const { captureRef } = require('react-native-view-shot') as typeof import('react-native-view-shot');
      const uri = await captureRef(qrCardRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: t('barber.shareQr'),
        UTI: 'public.png',
      });
    } catch {
      Alert.alert(t('errors.FAILED'));
    } finally {
      setSharingQr(false);
    }
  };

  const onUndoQrCheckIn = (item: TodayAppointment) => {
    Alert.alert(t('barber.undoAttendance'), t('barber.undoAttendanceConfirm'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('common.yes'),
        style: 'destructive',
        onPress: () => {
          setPendingId(item.id);
          void undoQrCheckIn(item.id)
            .then((result) => {
              if (result) {
                setSelectedAppointment(null);
                return refresh();
              }
              return undefined;
            })
            .finally(() => setPendingId(null));
        },
      },
    ]);
  };

  const listHeader = (
    <View style={styles.dashboardHeader}>
      {legalError ? (
        <View style={styles.legalNotice}>
          <ErrorBanner error={legalError} />
          <Button label={t('common.retry')} variant="secondary" onPress={() => void retryLegalAcceptance()} />
        </View>
      ) : null}

      <ErrorBanner error={error} />

      {isUnpublished ? (
        <View style={styles.activationCard} accessibilityLabel={t('barber.publishChecklistTitle')}>
          <Text style={styles.activationTitle}>{t('barber.publishChecklistTitle')}</Text>
          <Text style={styles.activationLine}>{t('barber.publishChecklistBody')}</Text>
          <Text style={styles.activationLine}>
            {`${readiness?.hasServices ? '✓' : '•'} ${t('barber.publishNeedsServices')}`}
          </Text>
          <Text style={styles.activationLine}>
            {`${readiness?.hasWorkingHours ? '✓' : '•'} ${t('barber.publishNeedsHours')}`}
          </Text>
          <EmailConfirmationRow />
          <ErrorBanner error={publishError} />
          <Button
            label={t('barber.stepServices')}
            variant="secondary"
            onPress={() => router.push('/(barber)/schedule')}
          />
          <Button
            label={t('barber.publish')}
            loading={publishing}
            disabled={!readiness?.hasServices || !readiness?.hasWorkingHours || emailPending}
            onPress={() => void publishProfile()}
          />
        </View>
      ) : null}

      {activationWorkplace && !isUnpublished ? (
        <View style={styles.activationCard} accessibilityLabel={t('barber.activationTitle')}>
          <Text style={styles.activationTitle}>{t('barber.activationTitle')}</Text>
          <Text style={styles.activationLine}>{t('barber.activationQr')}</Text>
          <Text style={styles.activationLine}>{t('barber.activationSchedule')}</Text>
          <Text style={styles.activationLine}>
            {activationWorkplace === 'owner'
              ? t('barber.activationShopOwner')
              : t('barber.activationShopWorker')}
          </Text>
          <Button
            label={t('barber.activationDismiss')}
            variant="secondary"
            onPress={() => void dismissActivationTips()}
          />
        </View>
      ) : null}

    </View>
  );

  return (
    <Screen padded={false} bleedTop style={styles.screen}>
      <RoleHomeHeader
        greeting={t('home.greeting')}
        name={profile?.name ?? t('profile.accountNameFallback')}
        profileLabel={t('tabs.profile')}
        notificationsLabel={t('profile.notifications')}
        onProfile={() => router.push('/(barber)/profile')}
        onNotifications={() => router.push('/notifications')}
        quickAction={profile?.id ? { label: t('barber.showQr'), icon: 'qr-code-outline', onPress: showQr } : undefined}
      >
        <Text style={styles.date}>{todayFormatter.format(new Date())}</Text>
        <View style={styles.counterRow}>
          <Counter label={t('barber.upcoming')} value={dashboard.counts.upcoming} />
          <Counter label={t('barber.present')} value={dashboard.counts.present} />
          <Counter label={t('barber.completed')} value={dashboard.counts.completed} />
        </View>
      </RoleHomeHeader>
      <View style={styles.body}>
        {listHeader}
        <FlatList
          testID="today-appointment-list"
          data={dashboard.appointments}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.list}
          style={styles.listView}
          refreshing={loading}
          onRefresh={() => void refresh()}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator style={styles.initialLoader} color={colors.primary} />
            ) : (
              <EmptyState
                title={t('barber.todayEmpty')}
                body={t('barber.todayEmptyBody')}
                actionLabel={t('barber.openSchedule')}
                onAction={() => router.push('/(barber)/schedule')}
                icon="calendar-clear-outline"
              />
            )
          }
          renderItem={({ item }) => {
            const quiet = item.status === 'completed' || item.status === 'cancelled' || item.status === 'absent';
            return (
              <View style={[styles.timelineRow, quiet && styles.appointmentRowQuiet]}>
                <View style={styles.timeColumn}>
                  <Text style={styles.time}>{formatBookingTime(item.starts_at)}</Text>
                  <Text style={styles.duration}>
                    {getTodayDurationMinutes(item)} {t('barber.durationMinutes')}
                  </Text>
                </View>
                <View
                  testID="today-appointment-card"
                  style={[styles.appointmentRow, item.status === 'present' && styles.appointmentRowActive]}
                >
                  <Pressable
                    testID="today-appointment-row"
                    style={({ pressed }) => [styles.appointmentMain, pressed && styles.appointmentRowPressed]}
                    onPress={() => setSelectedAppointment(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('barber.appointmentDetails')}، ${item.customer_name}، ${formatBookingTime(item.starts_at)}`}
                  >
                    <View style={styles.customerRow}>
                      <Avatar initials={getCustomerInitials(item.customer_name)} size={40} />
                      <View style={styles.appointmentCopy}>
                        <Text numberOfLines={1} style={styles.customerName}>{item.customer_name}</Text>
                        <Text numberOfLines={1} style={styles.serviceMeta}>{item.service_name}</Text>
                      </View>
                      <AppointmentStatusBadge status={item.status} />
                    </View>
                  </Pressable>

                  {item.status === 'booked' ? (
                    <Button
                      label={t('barber.confirmPresent')}
                      onPress={() => void onMarkPresent(item.id)}
                      loading={pendingId === item.id}
                      style={styles.rowAction}
                    />
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      </View>

      <Modal
        visible={qrPayload !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setQrPayload(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setQrPayload(null)}>
          <Pressable
            style={styles.modalCard}
            onPress={(event) => event.stopPropagation()}
            accessibilityViewIsModal
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('barber.qrTitle')}</Text>
              <Pressable
                style={styles.closeIcon}
                onPress={() => setQrPayload(null)}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <Icon name="close" size={22} color={colors.text} />
              </Pressable>
            </View>
            {qrPayload ? (
              <View ref={qrCardRef} testID="barber-qr-share-card" style={styles.qrShareCard}>
                <BrandLogo height={42} />
                <Text style={styles.qrBarberName}>{profile?.name}</Text>
                <View style={styles.qrCodeSurface}>
                  <QrCodeMatrix
                    value={qrPayload}
                    size={240}
                    foregroundColor={colors.text}
                    backgroundColor={colors.surface}
                    quietZone={12}
                    testID="barber-qr-code"
                  />
                </View>
                <Text style={styles.modalBody}>{t('barber.qrInstruction')}</Text>
              </View>
            ) : null}
            <Button
              label={t('barber.shareQr')}
              onPress={() => void shareQr()}
              loading={sharingQr}
              style={styles.modalButton}
            />
            <Button
              label={t('common.close')}
              variant="secondary"
              onPress={() => setQrPayload(null)}
              style={styles.modalButton}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={selectedAppointment !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAppointment(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedAppointment(null)}>
          <Pressable
            style={styles.modalCard}
            onPress={(event) => event.stopPropagation()}
            accessibilityViewIsModal
          >
            {selectedAppointment ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t('barber.appointmentDetails')}</Text>
                  <Pressable
                    style={styles.closeIcon}
                    onPress={() => setSelectedAppointment(null)}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.close')}
                  >
                    <Icon name="close" size={22} color={colors.text} />
                  </Pressable>
                </View>
                <View style={styles.detailSummary}>
                  <Avatar
                    initials={getCustomerInitials(selectedAppointment.customer_name)}
                    size={52}
                  />
                  <View style={styles.detailCopy}>
                    <Text style={styles.detailName}>{selectedAppointment.customer_name}</Text>
                    <Text selectable style={styles.detailPhone}>
                      {selectedAppointment.customer_phone}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRows}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailValue}>{selectedAppointment.service_name}</Text>
                    <Icon name="cut-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailValue}>
                      {formatBookingTime(selectedAppointment.starts_at)} ·{' '}
                      {getTodayDurationMinutes(selectedAppointment)} {t('barber.durationMinutes')}
                    </Text>
                    <Icon name="time-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailValue}>
                      {selectedAppointment.price_dzd.toLocaleString('ar-DZ')} {t('common.dzd')}
                    </Text>
                    <Icon name="cash-outline" size={20} color={colors.primary} />
                  </View>
                </View>
                <AppointmentStatusBadge status={selectedAppointment.status} />
                {selectedAppointment.status === 'present' &&
                selectedAppointment.qr_check_in_reversible ? (
                  <Button
                    label={t('barber.undoAttendance')}
                    variant="secondary"
                    onPress={() => onUndoQrCheckIn(selectedAppointment)}
                    loading={pendingId === selectedAppointment.id}
                    style={styles.modalButton}
                  />
                ) : null}
                {selectedAppointment.status === 'booked' ? (
                  <Button
                    label={t('home.cancelAppt')}
                    variant="danger"
                    onPress={() => onCancel(selectedAppointment)}
                    loading={pendingId === selectedAppointment.id}
                    style={styles.modalButton}
                  />
                ) : null}
                <Button
                  label={t('common.close')}
                  variant="secondary"
                  onPress={() => setSelectedAppointment(null)}
                  style={styles.modalButton}
                />
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  date: { ...typography.label, color: colors.onPrimaryMuted, textAlign: 'right' },
  body: {
    flex: 1,
    paddingTop: space[4],
    gap: space[3],
    paddingHorizontal: layout.screenPaddingX,
  },
  listView: {
    flex: 1,
  },
  list: {
    flexGrow: 1,
    gap: space[3],
    paddingBottom: space[10],
  },
  dashboardHeader: {
    gap: space[3],
  },
  legalNotice: {
    gap: space[2],
  },
  counterRow: {
    flexDirection: 'row-reverse',
    gap: space[2],
  },
  counter: {
    minWidth: 0,
    flex: 1,
    alignItems: 'flex-end',
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radii.md,
    backgroundColor: colors.stageOverlay,
  },
  counterValue: {
    ...typography.title,
    color: colors.onPrimary,
    fontVariant: ['tabular-nums'],
  },
  counterLabel: {
    ...typography.caption,
    color: colors.onPrimaryMuted,
    textAlign: 'right',
  },
  activationCard: {
    gap: space[2],
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: space[4],
    ...elevation.card,
  },
  activationTitle: {
    ...typography.titleSm,
    color: colors.text,
    textAlign: 'right',
  },
  activationLine: {
    ...typography.caption,
    textAlign: 'right',
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    backgroundColor: colors.primarySoft,
  },
  initialLoader: {
    paddingVertical: space[8],
  },
  timelineRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: space[3],
  },
  timeColumn: {
    width: 56,
    paddingTop: space[3],
    alignItems: 'center',
  },
  duration: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  appointmentRow: {
    flex: 1,
    minWidth: 0,
    gap: space[3],
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: space[3],
    ...elevation.card,
  },
  appointmentRowActive: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  appointmentMain: {
    borderRadius: radii.md,
  },
  appointmentRowPressed: {
    opacity: 0.7,
  },
  appointmentRowQuiet: {
    opacity: 0.6,
  },
  time: {
    ...typography.numeric,
    textAlign: 'center',
  },
  customerRow: {
    minWidth: 0,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[3],
  },
  appointmentCopy: {
    minWidth: 0,
    flex: 1,
    gap: 2,
    alignItems: 'flex-end',
  },
  customerName: {
    ...typography.bodyStrong,
    textAlign: 'right',
  },
  serviceMeta: {
    ...typography.caption,
    textAlign: 'right',
  },
  rowAction: {
    alignSelf: 'stretch',
  },
  modalBackdrop: {
    flex: 1,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.scrim,
    padding: space[5],
  },
  modalCard: {
    width: '100%',
    zIndex: 1001,
    maxWidth: 360,
    maxHeight: '88%',
    gap: space[4],
    borderRadius: radii['2xl'],
    backgroundColor: colors.surface,
    padding: space[5],
  },
  modalHeader: {
    minHeight: 48,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    ...typography.titleSm,
    flex: 1,
    textAlign: 'right',
  },
  closeIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  qrCodeSurface: {
    width: 272,
    height: 272,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  qrShareCard: {
    width: '100%',
    alignItems: 'center',
    gap: space[3],
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: space[4],
  },
  qrBarberName: {
    ...typography.titleSm,
    color: colors.text,
    textAlign: 'center',
  },
  modalBody: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  modalButton: {
    width: '100%',
  },
  detailSummary: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[3],
  },
  detailCopy: {
    minWidth: 0,
    flex: 1,
    gap: space[1],
    alignItems: 'flex-end',
  },
  detailName: {
    ...typography.titleSm,
    textAlign: 'right',
  },
  detailPhone: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'right',
  },
  detailRows: {
    gap: space[2],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: space[3],
  },
  detailRow: {
    minHeight: 36,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[3],
  },
  detailValue: {
    ...typography.body,
    minWidth: 0,
    flex: 1,
    textAlign: 'right',
  },
});
