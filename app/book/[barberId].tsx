import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from 'heroui-native/button';
import { Card } from 'heroui-native/card';
import { Chip } from 'heroui-native/chip';
import { Skeleton } from 'heroui-native/skeleton';
import { Typography } from 'heroui-native/text';

import {
  bookingDates,
  formatBookingDate,
  formatBookingTime,
  type BarberProfile,
  type BookingSlot,
} from '@/src/booking';
import { BackButton, CustomerStageHeader, ErrorBanner, Screen } from '@/src/components/ui';
import {
  canAdvanceBookingStep,
  nextBookingStep,
  previousBookingStep,
  type BookingStep,
} from '@/src/features/booking/bookingSteps';
import { InlineDateCalendar } from '@/src/features/barber-schedule/InlineDateCalendar';
import { useBooking } from '@/src/hooks/useBooking';
import { useAppSession } from '@/src/providers/SessionProvider';
import { t } from '@/src/i18n';
import { bookingReturnHref } from '@/src/navigation/bookingNavigation';
import { setPendingIntentFromPath } from '@/src/navigation/pendingIntent';
import { colors, space } from '@/src/theme';

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

  return (
    <Screen padded={false} scroll>
      <CustomerStageHeader
        tone={headerTone}
        context={t('auth.roleCustomer')}
        title={step === 'recap' ? t('booking.recapTitle') : appointmentId ? t('home.reschedule') : t('booking.book')}
        subtitle={barber?.name}
        trailing={<BackButton fallback={returnHref} tone={headerTone === 'stage' ? 'onPrimary' : 'primary'} onPress={goBack} />}
      />
      <View style={styles.body}>
        <ErrorBanner error={error} />
        {message ? (
          <Typography type="body-xs" align="end" style={{ color: colors.primary }}>
            {message}
          </Typography>
        ) : null}

        {step === 'date' ? (
          <>
            <Typography type="h5" align="end">{t('booking.chooseService')}</Typography>
            <View style={styles.wrap}>
              {barber?.services.map((service) => (
                <Chip
                  key={service.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${service.name} · ${service.price_dzd} ${t('common.dzd')}`}
                  variant={serviceId === service.id ? 'primary' : 'secondary'}
                  color={serviceId === service.id ? 'accent' : 'default'}
                  onPress={() => setServiceId(service.id)}
                >
                  <Chip.Label>{`${service.name} · ${service.price_dzd} ${t('common.dzd')}`}</Chip.Label>
                </Chip>
              ))}
            </View>
            <Typography type="h5" align="end">{t('booking.chooseDate')}</Typography>
            {date ? (
              <InlineDateCalendar
                value={date}
                minimumDate={dates[0] ?? date}
                onChange={setDate}
              />
            ) : null}
            <Button
              isDisabled={!canAdvanceBookingStep('date', { serviceId, date, slot: selectedSlot })}
              onPress={() => setStep(nextBookingStep('date'))}
            >
              <Button.Label>{t('common.next')}</Button.Label>
            </Button>
          </>
        ) : null}

        {step === 'slots' ? (
          <>
            <Typography type="h5" align="end">{t('booking.chooseSlot')}</Typography>
            {slotsLoading ? <Skeleton className="h-12 w-full rounded-lg" /> : null}
            {!slotsLoading && slots.length === 0 ? (
              <Card className="p-6 items-center gap-3">
                <Typography type="h5" align="center">{t('booking.noSlots')}</Typography>
                <Typography type="body" color="muted" align="center">{t('booking.noSlotsBody')}</Typography>
                <Button variant="secondary" onPress={() => setStep('date')}>
                  <Button.Label>{t('booking.changeDate')}</Button.Label>
                </Button>
              </Card>
            ) : null}
            <View style={styles.wrap}>
              {slots.map((slot) => (
                <Chip
                  key={slot.starts_at}
                  accessibilityRole="button"
                  accessibilityLabel={formatBookingTime(slot.starts_at)}
                  variant={selectedSlot === slot.starts_at ? 'primary' : 'secondary'}
                  color={selectedSlot === slot.starts_at ? 'accent' : 'default'}
                  onPress={() => setSelectedSlot(slot.starts_at)}
                >
                  <Chip.Label>{formatBookingTime(slot.starts_at)}</Chip.Label>
                </Chip>
              ))}
            </View>
            <Button
              isDisabled={!canAdvanceBookingStep('slots', { serviceId, date, slot: selectedSlot })}
              onPress={() => setStep(nextBookingStep('slots'))}
            >
              <Button.Label>{t('common.next')}</Button.Label>
            </Button>
          </>
        ) : null}

        {step === 'recap' && selectedService && selectedSlot ? (
          <Card className="gap-2 p-4">
            <Typography type="body-xs" color="muted" align="end">{t('booking.chooseService')}</Typography>
            <Typography type="body" weight="semibold" align="end">{selectedService.name}</Typography>
            <Typography type="body-xs" color="muted" align="end">{t('common.date')}</Typography>
            <Typography type="body" weight="semibold" align="end">{formatBookingDate(date)}</Typography>
            <Typography type="body-xs" color="muted" align="end">{t('common.time')}</Typography>
            <Typography type="body" weight="semibold" align="end">{formatBookingTime(selectedSlot)}</Typography>
            <Typography type="body-xs" color="muted" align="end">{t('common.price')}</Typography>
            <Typography type="body" weight="semibold" align="end">{`${selectedService.price_dzd} ${t('common.dzd')}`}</Typography>
            <Typography type="body-xs" color="muted" align="center">{t('booking.payAtShop')}</Typography>
            {needsEmailConfirmation ? (
              <>
                <Typography type="body" weight="semibold" align="center">{t('booking.confirmEmailTitle')}</Typography>
                <Typography type="body-xs" color="muted" align="center">{t('booking.confirmEmailBody')}</Typography>
                <Typography type="body-xs" align="center" style={{ color: colors.primary }}>
                  {session?.user.email ?? ''}
                </Typography>
                <ErrorBanner error={resendError} />
                {resendNote ? (
                  <Typography type="body-xs" align="center" style={{ color: colors.primary }}>{resendNote}</Typography>
                ) : null}
                <Button testID="resend-booking-confirmation" variant="secondary" onPress={() => void resendConfirmation()}>
                  <Button.Label>{t('booking.confirmEmailResend')}</Button.Label>
                </Button>
              </>
            ) : guestBrowsing ? (
              <>
                <Typography type="body-xs" color="muted" align="center">{t('booking.guestBookNote')}</Typography>
                <Button testID="guest-sign-in-to-book" onPress={signInToBook}>
                  <Button.Label>{t('booking.signInToBook')}</Button.Label>
                </Button>
              </>
            ) : (
              <Button isDisabled={loading} onPress={() => void confirm()}>
                <Button.Label>{appointmentId ? t('home.reschedule') : t('booking.confirmBook')}</Button.Label>
              </Button>
            )}
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: space[5],
    gap: space[3],
    paddingBottom: space[8],
  },
  wrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: space[2],
  },
});
