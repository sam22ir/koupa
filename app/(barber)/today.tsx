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
  appointmentStatusLabel,
  formatBookingTime,
  type TodayAppointment,
} from '@/src/booking';
import {
  getCustomerInitials,
  getTodayDashboard,
  getTodayDurationMinutes,
} from '@/src/barberToday';
import {
  Avatar,
  BrandLogo,
  Button,
  Chip,
  EmptyState,
  ErrorBanner,
  Icon,
  Screen,
  Stage,
} from '@/src/components/ui';
import { QrCodeMatrix } from '@/src/components/QrCodeMatrix';
import { useBooking } from '@/src/hooks/useBooking';
import { t } from '@/src/i18n';
import { buildBarberCheckInPayload } from '@/src/qr';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, elevation, layout, radii, space, typography } from '@/src/theme';

const todayFormatter = new Intl.DateTimeFormat('ar-DZ', {
  timeZone: 'Africa/Algiers',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function statusTone(status: TodayAppointment['status']): 'primary' | 'accent' | 'neutral' {
  if (status === 'booked') return 'primary';
  if (status === 'present') return 'accent';
  return 'neutral';
}

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
  const { profile, legalError, retryLegalAcceptance } = useAppSession();
  const { today, markPresent, cancelBarber, undoQrCheckIn, error } = useBooking();
  const [items, setItems] = useState<readonly TodayAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<TodayAppointment | null>(null);
  const [sharingQr, setSharingQr] = useState(false);
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
    }, [refresh]),
  );

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
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert(t('barber.shareUnavailable'));
      return;
    }

    // Expo Go does not guarantee the optional RNViewShot native module.
    // Keep it out of startup evaluation; a development build can still share.
    if (Constants.appOwnership === 'expo') {
      Alert.alert(t('barber.shareUnavailable'));
      return;
    }

    setSharingQr(true);
    try {
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
      <View style={styles.counterRow}>
        <Counter label={t('barber.upcoming')} value={dashboard.counts.upcoming} />
        <View style={styles.counterDivider} />
        <Counter label={t('barber.present')} value={dashboard.counts.present} />
        <View style={styles.counterDivider} />
        <Counter label={t('barber.completed')} value={dashboard.counts.completed} />
      </View>

      <ErrorBanner error={error} />

      <Pressable
        style={({ pressed }) => [styles.qrAction, pressed && styles.pressed]}
        onPress={showQr}
        accessibilityRole="button"
        accessibilityLabel={t('barber.showQr')}
        disabled={!profile?.id}
      >
        <View style={styles.qrActionCopy}>
          <Icon name="qr-code-outline" size={21} color={colors.primary} />
          <Text style={styles.qrActionText}>{t('barber.showQr')}</Text>
        </View>
        <Icon name="chevron-back" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );

  return (
    <Screen padded={false} style={styles.screen}>
      <Stage decoration="subtle">
        <View style={styles.stageTopRow}>
          <View testID="today-logo-wrap" style={styles.logoWrap}>
            <BrandLogo variant="full" height={56} imageStyle={styles.logoImage} />
            <View testID="today-logo-accent" style={styles.logoAccent} />
          </View>
          <Pressable
            style={({ pressed }) => [styles.headerQrButton, pressed && styles.headerQrPressed]}
            onPress={showQr}
            accessibilityRole="button"
            accessibilityLabel={t('barber.showQr')}
            disabled={!profile?.id}
          >
            <Icon name="qr-code-outline" size={22} color={colors.onPrimary} />
          </Pressable>
        </View>
        <View style={styles.stageTitleBlock}>
          <Text style={styles.title}>{t('barber.todayTitle')}</Text>
          <Text style={styles.date}>{todayFormatter.format(new Date())}</Text>
        </View>
      </Stage>

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
          renderItem={({ item }) => (
            <Pressable
              testID="today-appointment-row"
              style={({ pressed }) => [
                styles.appointmentRow,
                pressed && styles.appointmentRowPressed,
                (item.status === 'completed' ||
                  item.status === 'cancelled' ||
                  item.status === 'absent') &&
                  styles.appointmentRowQuiet,
              ]}
              onPress={() => setSelectedAppointment(item)}
              accessibilityRole="button"
              accessibilityLabel={`${t('barber.appointmentDetails')}، ${item.customer_name}، ${formatBookingTime(item.starts_at)}`}
            >
              <View style={styles.appointmentHeader}>
                <Text style={styles.time}>{formatBookingTime(item.starts_at)}</Text>
                <Chip label={appointmentStatusLabel(item.status)} tone={statusTone(item.status)} />
              </View>

              <View style={styles.customerRow}>
                <Avatar initials={getCustomerInitials(item.customer_name)} size={44} />
                <View style={styles.appointmentCopy}>
                  <Text style={styles.customerName}>{item.customer_name}</Text>
                  <Text style={styles.serviceMeta}>
                    {item.service_name} · {getTodayDurationMinutes(item)}{' '}
                    {t('barber.durationMinutes')}
                  </Text>
                </View>
              </View>

              {item.status === 'booked' ? (
                <Button
                  label={t('barber.confirmPresent')}
                  onPress={() => void onMarkPresent(item.id)}
                  loading={pendingId === item.id}
                  style={styles.rowAction}
                />
              ) : null}
            </Pressable>
          )}
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
                <Text style={styles.qrBrand}>كوپا</Text>
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
                <Chip
                  label={appointmentStatusLabel(selectedAppointment.status)}
                  tone={statusTone(selectedAppointment.status)}
                />
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
                {selectedAppointment.status === 'booked' ||
                selectedAppointment.status === 'present' ? (
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
  screen: { backgroundColor: colors.workspace },
  stageTopRow: {
    minHeight: 72,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    gap: space[2],
  },
  logoImage: {
    tintColor: colors.onPrimary,
    opacity: 0.96,
  },
  logoAccent: {
    width: space[8],
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  headerQrButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.stageOverlay,
  },
  headerQrPressed: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  stageTitleBlock: {
    gap: space[1],
    alignItems: 'flex-end',
  },
  title: {
    ...typography.title,
    color: colors.onPrimary,
    textAlign: 'right',
  },
  date: {
    ...typography.caption,
    color: colors.onPrimaryMuted,
    textAlign: 'right',
  },
  body: {
    flex: 1,
    marginTop: layout.stageBodyOverlap,
    gap: space[3],
    paddingHorizontal: layout.screenPaddingX,
    backgroundColor: colors.workspace,
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
    minHeight: 86,
    flexDirection: 'row-reverse',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...elevation.card,
  },
  counter: {
    minWidth: 0,
    flex: 1,
    gap: space[1],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[2],
    paddingVertical: space[3],
  },
  counterDivider: {
    width: 1,
    marginVertical: space[3],
    backgroundColor: colors.border,
  },
  counterValue: {
    ...typography.title,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  counterLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  qrAction: {
    minHeight: 52,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: space[4],
  },
  qrActionCopy: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[2],
  },
  qrActionText: {
    ...typography.label,
    color: colors.primary,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    backgroundColor: colors.primarySoft,
  },
  initialLoader: {
    paddingVertical: space[8],
  },
  appointmentRow: {
    gap: space[3],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: space[4],
  },
  appointmentRowPressed: {
    backgroundColor: colors.primarySoft,
  },
  appointmentRowQuiet: {
    opacity: 0.72,
  },
  appointmentHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    ...typography.titleSm,
    color: colors.text,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
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
    gap: space[1],
    alignItems: 'flex-end',
  },
  customerName: {
    ...typography.bodyStrong,
    textAlign: 'right',
  },
  serviceMeta: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'right',
  },
  rowAction: {
    minWidth: 132,
    alignSelf: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,28,34,0.58)',
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
  qrBrand: {
    ...typography.title,
    color: colors.primary,
    textAlign: 'center',
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
