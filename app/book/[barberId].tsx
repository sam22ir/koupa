import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { t } from '@/src/i18n';
import { bookingReturnHref } from '@/src/navigation/bookingNavigation';
import { colors, space } from '@/src/theme';

export default function BookScreen() {
  const { barberId, appointmentId, serviceId: initialServiceId, returnTo } = useLocalSearchParams<{
    barberId: string;
    appointmentId?: string;
    serviceId?: string;
    returnTo?: string;
  }>();
  const { getBarber, getSlots, book, reschedule, loading, error } = useBooking();
  const [barber, setBarber] = useState<BarberProfile | null>(null);
  const [serviceId, setServiceId] = useState(initialServiceId ?? '');
  const [date, setDate] = useState('');
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
  const selectedService = barber?.services.find((service) => service.id === serviceId) ?? null;

  useEffect(() => {
    if (!barberId) return;
    let active = true;
    void getBarber(barberId).then((rows) => {
      if (!active) return;
      const next = rows?.[0] ?? null;
      setBarber(next);
      setServiceId((current) => current || next?.services[0]?.id || '');
      setDate((current) => current || dates[0] || '');
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
    if (!barberId || !serviceId || !date) {
      setSlotsLoading(false);
      return;
    }
    let active = true;
    setSlotsLoading(true);
    void getSlots(barberId, serviceId, date).then((next) => {
      if (active) setSlots(next ?? []);
    }).finally(() => {
      if (active) setSlotsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [barberId, getSlots, date, serviceId]);

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
            <Button isDisabled={loading} onPress={() => void confirm()}>
              <Button.Label>{appointmentId ? t('home.reschedule') : t('booking.confirmBook')}</Button.Label>
            </Button>
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