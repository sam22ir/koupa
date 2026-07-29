import { useCallback, useMemo } from 'react';
import type { Appointment, BarberProfile, BarberSummary, BookingSlot, TodayAppointment } from '@/src/booking';
import { useAsyncRunner } from '@/src/services/asyncRunner';
import * as bookingService from '@/src/services/booking';
import { bookingErrorMessage } from '@/src/services/errors';

export function useBooking() {
  const { loading, error, clearError, run, runVoid } = useAsyncRunner();
  const mapError = useCallback((caught: unknown) => bookingErrorMessage(caught), []);

  const searchBarbers = useCallback(
    (query: string, city = '', page = 0) => run(() => bookingService.searchBarbers(query, city, page), mapError),
    [mapError, run],
  );
  const getBarber = useCallback((barberId: string) => run(() => bookingService.getBarber(barberId), mapError), [mapError, run]);
  const getSlots = useCallback(
    (barberId: string, serviceId: string, localDate: string) =>
      run(() => bookingService.getSlots(barberId, serviceId, localDate), mapError),
    [mapError, run],
  );
  const book = useCallback(
    (barberId: string, serviceId: string, startsAt: string) =>
      run(() => bookingService.bookAppointment(barberId, serviceId, startsAt), mapError),
    [mapError, run],
  );
  const reschedule = useCallback(
    (appointmentId: string, serviceId: string, startsAt: string) =>
      run(() => bookingService.rescheduleAppointment(appointmentId, serviceId, startsAt), mapError),
    [mapError, run],
  );
  const cancelCustomer = useCallback(
    (appointmentId: string) => runVoid(() => bookingService.cancelCustomerAppointment(appointmentId), mapError),
    [mapError, runVoid],
  );
  const cancelBarber = useCallback(
    (appointmentId: string) => runVoid(() => bookingService.cancelBarberAppointment(appointmentId), mapError),
    [mapError, runVoid],
  );
  const markPresent = useCallback(
    (appointmentId: string) => run(() => bookingService.markAppointmentPresent(appointmentId), mapError),
    [mapError, run],
  );
  const checkInWithQr = useCallback(
    (barberId: string) => run(() => bookingService.checkInWithQr(barberId), mapError),
    [mapError, run],
  );
  const undoQrCheckIn = useCallback(
    (appointmentId: string) => run(() => bookingService.undoQrCheckIn(appointmentId), mapError),
    [mapError, run],
  );
  const rateAppointment = useCallback(
    (appointmentId: string, stars: number) =>
      run(() => bookingService.rateAppointment(appointmentId, stars), mapError),
    [mapError, run],
  );
  const today = useCallback(
    () => run(() => bookingService.barberTodayAppointments(), mapError),
    [mapError, run],
  );

  // Actions stay referentially stable across loading/error flips.
  const actions = useMemo(
    () => ({
      clearError,
      searchBarbers: searchBarbers as (
        query: string,
        city?: string,
        page?: number,
      ) => Promise<readonly BarberSummary[] | null>,
      getBarber: getBarber as (id: string) => Promise<readonly BarberProfile[] | null>,
      getSlots: getSlots as (
        barberId: string,
        serviceId: string,
        date: string,
      ) => Promise<readonly BookingSlot[] | null>,
      book,
      reschedule,
      cancelCustomer,
      cancelBarber,
      markPresent,
      checkInWithQr,
      undoQrCheckIn,
      rateAppointment,
      today: today as () => Promise<readonly TodayAppointment[] | null>,
    }),
    [
      clearError,
      searchBarbers,
      getBarber,
      getSlots,
      book,
      reschedule,
      cancelCustomer,
      cancelBarber,
      markPresent,
      checkInWithQr,
      undoQrCheckIn,
      rateAppointment,
      today,
    ],
  );

  return {
    loading,
    error,
    ...actions,
  };
}

export async function loadCustomerAppointments(): Promise<readonly Appointment[]> {
  return bookingService.loadCustomerAppointments();
}
