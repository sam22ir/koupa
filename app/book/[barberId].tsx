import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from 'heroui-native/button';
import { Card } from 'heroui-native/card';
import { Skeleton } from 'heroui-native/skeleton';
import { Typography } from 'heroui-native/text';

import {
  bookingDates,
  formatBookingDate,
  formatBookingTime,
  type BarberProfile,
  type BookingSlot,
} from '@/src/booking';
import {
  BackButton,
  CustomerStageHeader,
  DateStrip,
  DetailList,
  EmptyState,
  ErrorBanner,
  OptionCard,
  Screen,
  SectionHeader,
  TimeSlotGrid,
} from '@/src/components/ui';
import {
  canAdvanceBookingStep,
  nextBookingStep,
  previousBookingStep,
  type BookingStep,
} from '@/src/features/booking/bookingSteps';
import { useBooking } from '@/src/hooks/useBooking';
import { useAppSession } from '@/src/providers/SessionProvider';
import { t } from '@/src/i18n';
import { bookingReturnHref } from '@/src/navigation/bookingNavigation';
import { setPendingIntentFromPath } from '@/src/navigation/pendingIntent';
import { colors, elevation, layout, space, typography } from '@/src/theme';

export default function BookScreen() {
  const {
    barberId,
    appointmentId,
    serviceId: initialServiceId,
    date: restoredDate,
    slot: restoredSlot,
    returnTo,
  } = useLocalSearchParams<{
    barberId: string;
    appointmentId?: string;
    serviceId?: string;
    date?: string;
    slot?: string;
    returnTo?: string;
  }>();
  const { guestBrowsing, session, emailConfirmed, resendEmailConfirmation } = useAppSession();
  const [resendNote, setResendNote] = useState('');
  const [resendError, setResendError] = useState<unknown>(null);
  // The database only accepts a first booking from a confirmed email.
  const needsEmailConfirmation = !guestBrowsing && !appointmentId && Boolean(session) && !emailConfirmed;
  const { getBarber, getSlots, book, reschedule, loading, error } = useBooking();
  const [barber, setBarber] = useState<BarberProfile | null>(null);
  const [serviceId, setServiceId] = useState(initialServiceId ?? '');
  // A booking carried through sign-up or email confirmation returns with its date
  // and time; they are applied once the slots for that day have loaded.
  const carriedBooking = restoredDate && restoredSlot && /^\d{4}-\d{2}-\d{2}$/.test(restoredDate)
    ? { date: restoredDate, slot: restoredSlot }
    : null;
  const restoreRef = useRef(carriedBooking);
  const [date, setDate] = useState(carriedBooking?.date ?? '');
  const [slots, setSlots] = useState<readonly BookingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [step, setStep] = useState<BookingStep>('date');
  const [message, setMessage] = useState('');
  const returnHref = bookingReturnHref({ barberId, appointmentId, returnTo });

  const dates = useMemo(
    () => bookingDates(barber?.booking_window_days ?? 7),
    [barber?.booking_window_days],
  );
  const loadedBarberId = barber?.id ?? '';
  const selectedService = barber?.services.find((service) => service.id === serviceId) ?? null;

  useEffect(() => {
    if (!barberId) return;
    let active = true;
    void getBarber(barberId).then((rows) => {
      // null means superseded by a slots request or failed: keep any loaded barber.
      if (!active || !rows) return;
      const next = rows[0] ?? null;
      setBarber(next);
      setServiceId((current) => current || next?.services[0]?.id || '');
      // Keep a restored date only while it is still inside the booking window.
      setDate((current) => (current && dates.includes(current) ? current : dates[0] || ''));
    });
    return () => {
      active = false;
    };
  }, [barberId, getBarber, dates]);

  useEffect(() => {
    // Selection state must be cleared before a new slot request is displayed.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedSlot('');
    setSlots([]);
    if (step === 'recap') setStep('slots');
    // Wait for the barber: a carried date is only validated against their booking window then.
    if (!barberId || !serviceId || !date || !loadedBarberId) {
      setSlotsLoading(false);
      return;
    }
    let active = true;
    setSlotsLoading(true);
    void getSlots(barberId, serviceId, date).then((next) => {
      if (!active) return;
      setSlots(next ?? []);
      const want = restoreRef.current;
      restoreRef.current = null;
      if (want && want.date === date) {
        if (next?.some((slot) => slot.starts_at === want.slot)) {
          setSelectedSlot(want.slot);
          setStep('recap');
        } else {
          // The time was taken meanwhile: show the day's slots to choose another.
          setStep('slots');
        }
      }
    }).finally(() => {
      if (active) setSlotsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [barberId, getSlots, date, serviceId, loadedBarberId]);

  // The confirmation link reopens the app at `/`; keep this booking pending so
  // the customer lands back here with their service instead of on Home.
  useEffect(() => {
    if (!needsEmailConfirmation || !barberId) return;
    setPendingIntentFromPath(`/book/${barberId}`, {
      serviceId,
      date,
      slot: selectedSlot,
      returnTo: `/barber/${barberId}`,
    });
  }, [needsEmailConfirmation, barberId, serviceId, date, selectedSlot]);

  const resendConfirmation = async () => {
    setResendError(null);
    setResendNote('');
    try {
      await resendEmailConfirmation(session?.user.email?.trim() ?? '');
      setResendNote(t('booking.confirmEmailResent'));
    } catch (caught) {
      setResendError(caught);
    }
  };

  const confirm = async () => {
    setMessage('');
    if (!serviceId || !selectedSlot) return;
    if (appointmentId) {
      const result = await reschedule(appointmentId, serviceId, selectedSlot);
      if (result) {
        setMessage(t('common.done'));
        router.dismissAll();
        router.replace('/(customer)/appointments');
      }
      return;
    }
    const result = await book(barberId, serviceId, selectedSlot);
    if (result) {
      setMessage(t('common.done'));
      router.dismissAll();
      router.replace('/(customer)/appointments');
    }
  };

  // A guest keeps their service choice and comes back here after signing up.
  const signInToBook = () => {
    setPendingIntentFromPath(`/book/${barberId}`, {
      serviceId,
      date,
      slot: selectedSlot,
      returnTo: `/barber/${barberId}`,
    });
    router.push({ pathname: '/(auth)/sign-up', params: { role: 'customer' } });
  };

  const goBack = () => {
    if (step === 'date') {
      router.dismissTo(returnHref);
      return;
    }
    setStep(previousBookingStep(step));
  };

  const headerTone = step === 'recap' ? 'stage' : 'paper';
  const price = (value: number) => `${value.toLocaleString('ar-DZ')} ${t('common.dzd')}`;

  const footer = step === 'date' ? (
    <FooterAction
      summary={selectedService ? price(selectedService.price_dzd) : undefined}
      caption={date ? formatBookingDate(date) : undefined}
    >
      <Button
        className="flex-1"
        isDisabled={!canAdvanceBookingStep('date', { serviceId, date, slot: selectedSlot })}
        onPress={() => setStep(nextBookingStep('date'))}
      >
        <Button.Label>{t('common.next')}</Button.Label>
      </Button>
    </FooterAction>
  ) : step === 'slots' ? (
    <FooterAction
      summary={selectedService ? price(selectedService.price_dzd) : undefined}
      caption={selectedSlot ? formatBookingTime(selectedSlot) : date ? formatBookingDate(date) : undefined}
    >
      <Button
        className="flex-1"
        isDisabled={!canAdvanceBookingStep('slots', { serviceId, date, slot: selectedSlot })}
        onPress={() => setStep(nextBookingStep('slots'))}
      >
        <Button.Label>{t('common.next')}</Button.Label>
      </Button>
    </FooterAction>
  ) : step === 'recap' && selectedService && selectedSlot && !needsEmailConfirmation ? (
    guestBrowsing ? (
      <Button testID="guest-sign-in-to-book" onPress={signInToBook}>
        <Button.Label>{t('booking.signInToBook')}</Button.Label>
      </Button>
    ) : (
      <Button isDisabled={loading} onPress={() => void confirm()}>
        <Button.Label>{appointmentId ? t('home.reschedule') : t('booking.confirmBook')}</Button.Label>
      </Button>
    )
  ) : undefined;

  return (
    <Screen padded={false} scroll bleedTop={headerTone === 'stage'} footer={footer}>
      <CustomerStageHeader
        tone={headerTone}
        context={t('auth.roleCustomer')}
        title={step === 'recap' ? t('booking.recapTitle') : appointmentId ? t('home.reschedule') : t('booking.book')}
        subtitle={barber?.name}
        trailing={<BackButton fallback={returnHref} tone={headerTone === 'stage' ? 'onPrimary' : 'primary'} onPress={goBack} />}
      />
      <View style={[styles.body, step === 'recap' && styles.lifted]}>
        <ErrorBanner error={error} />
        {message ? (
          <Text style={[styles.note, styles.noteSuccess]}>{message}</Text>
        ) : null}

        {step === 'date' ? (
          <>
            <View style={styles.section}>
              <SectionHeader title={t('booking.chooseService')} />
              <View accessibilityRole="radiogroup" style={styles.options}>
                {barber?.services.map((service) => (
                  <OptionCard
                    key={service.id}
                    title={service.name}
                    subtitle={`${service.duration_minutes} ${t('barber.durationMinutes')}`}
                    value={price(service.price_dzd)}
                    accessibilityLabel={`${service.name} · ${service.price_dzd} ${t('common.dzd')}`}
                    selected={serviceId === service.id}
                    onPress={() => setServiceId(service.id)}
                  />
                ))}
              </View>
            </View>
            <View style={styles.section}>
              <SectionHeader title={t('booking.chooseDate')} />
              {date ? <DateStrip dates={dates} value={date} onChange={setDate} /> : null}
            </View>
          </>
        ) : null}

        {step === 'slots' ? (
          <View style={styles.section}>
            <SectionHeader title={t('booking.chooseSlot')} hint={date ? formatBookingDate(date) : undefined} />
            {slotsLoading ? (
              <View style={styles.slotSkeleton}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <Skeleton key={index} className="h-[46px] flex-1 min-w-[30%] rounded-xl" />
                ))}
              </View>
            ) : null}
            {!slotsLoading && slots.length === 0 ? (
              <Card className="p-2">
                <EmptyState
                  icon="time-outline"
                  title={t('booking.noSlots')}
                  body={t('booking.noSlotsBody')}
                  actionLabel={t('booking.changeDate')}
                  onAction={() => setStep('date')}
                />
              </Card>
            ) : null}
            <TimeSlotGrid
              slots={slots.map((slot) => ({ key: slot.starts_at, label: formatBookingTime(slot.starts_at) }))}
              selected={selectedSlot}
              onSelect={setSelectedSlot}
            />
          </View>
        ) : null}

        {step === 'recap' && selectedService && selectedSlot ? (
          <Card className="gap-4 p-5" style={styles.recapCard}>
            <DetailList
              rows={[
                { label: t('common.service'), value: selectedService.name },
                { label: t('common.date'), value: formatBookingDate(date) },
                { label: t('common.time'), value: formatBookingTime(selectedSlot) },
              ]}
              total={{ label: t('common.price'), value: `${selectedService.price_dzd} ${t('common.dzd')}` }}
            />
            <Text style={styles.payNote}>{t('booking.payAtShop')}</Text>
            {needsEmailConfirmation ? (
              <View style={styles.notice}>
                <Typography type="body" weight="semibold" align="center">{t('booking.confirmEmailTitle')}</Typography>
                <Typography type="body-xs" color="muted" align="center">{t('booking.confirmEmailBody')}</Typography>
                <Text style={[styles.note, styles.noteCenter, styles.noteEmail]}>{session?.user.email ?? ''}</Text>
                <ErrorBanner error={resendError} />
                {resendNote ? (
                  <Text style={[styles.note, styles.noteCenter, styles.noteSuccess]}>{resendNote}</Text>
                ) : null}
                <Button testID="resend-booking-confirmation" variant="secondary" onPress={() => void resendConfirmation()}>
                  <Button.Label>{t('booking.confirmEmailResend')}</Button.Label>
                </Button>
              </View>
            ) : guestBrowsing ? (
              <Typography type="body-xs" color="muted" align="center">{t('booking.guestBookNote')}</Typography>
            ) : null}
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

/** Sticky footer: running summary on the reading edge, the step's action opposite. */
function FooterAction({
  summary,
  caption,
  children,
}: {
  readonly summary?: string;
  readonly caption?: string;
  readonly children: ReactNode;
}) {
  return (
    <View style={styles.footerRow}>
      {summary ? (
        <View style={styles.footerSummary}>
          {caption ? <Text numberOfLines={1} style={styles.footerCaption}>{caption}</Text> : null}
          <Text style={styles.footerPrice}>{summary}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: layout.screenPaddingX,
    gap: space[6],
    paddingBottom: space[4],
  },
  lifted: { marginTop: layout.stageBodyOverlap },
  section: { gap: space[3] },
  options: { gap: space[2] },
  slotSkeleton: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: space[2] },
  recapCard: { ...elevation.float },
  payNote: { ...typography.caption, textAlign: 'center' },
  note: { ...typography.caption, textAlign: 'right' },
  noteCenter: { textAlign: 'center' },
  noteSuccess: { color: colors.success },
  noteEmail: { ...typography.label, color: colors.primarySoftText },
  notice: { gap: space[2] },
  footerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[4] },
  footerSummary: { flexShrink: 1, alignItems: 'flex-end' },
  footerCaption: { ...typography.caption, textAlign: 'right' },
  footerPrice: { ...typography.numeric, fontSize: 17, lineHeight: 24, textAlign: 'right' },
});
