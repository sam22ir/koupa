import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Appointment, BarberProfile, BarberSummary, BookingSlot, TodayAppointment } from '@/src/booking';

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('unavailable')) return 'هذا الوقت لم يعد متاحاً. اختر وقتاً آخر.';
  if (message.includes('active appointment')) return 'لديك موعد نشط بالفعل.';
  if (message.includes('cannot be cancelled')) return 'لا يمكن إلغاء الموعد في هذا الوقت.';
  return 'تعذّر إكمال العملية. حاول مرة أخرى.';
}

export function useBooking() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const run = useCallback(async <T,>(action: () => PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T | null> => {
    const currentRequest = ++requestId.current;
    setLoading(true); setError('');
    const { data, error: requestError } = await action();
    if (currentRequest !== requestId.current) return data;
    setLoading(false);
    if (requestError) { setError(errorMessage(new Error(requestError.message))); return null; }
    return data;
  }, []);
  const runVoid = useCallback(async (action: () => PromiseLike<{ error: { message: string } | null }>): Promise<boolean> => {
    const currentRequest = ++requestId.current;
    setLoading(true); setError('');
    const { error: requestError } = await action();
    if (currentRequest !== requestId.current) return !requestError;
    setLoading(false);
    if (requestError) { setError(errorMessage(new Error(requestError.message))); return false; }
    return true;
  }, []);
  const searchBarbers = useCallback((query: string, city = '') => run(() => supabase.rpc('search_published_barbers', { search_query: query, city_query: city, page_number: 0 }) as never), [run]);
  const getBarber = useCallback((barberId: string) => run(() => supabase.rpc('get_public_barber_profile', { barber_id: barberId }) as never), [run]);
  const getSlots = useCallback((barberId: string, serviceId: string, localDate: string) => run(() => supabase.rpc('available_booking_slots', { barber_id: barberId, service_id: serviceId, local_date: localDate }) as never), [run]);
  const book = useCallback((barberId: string, serviceId: string, startsAt: string) => run(() => supabase.rpc('book_appointment', { barber_id: barberId, service_id: serviceId, starts_at_value: startsAt }) as never), [run]);
  const reschedule = useCallback((appointmentId: string, serviceId: string, startsAt: string) => run(() => supabase.rpc('reschedule_appointment', { appointment_id: appointmentId, service_id: serviceId, starts_at_value: startsAt }) as never), [run]);
  const cancelCustomer = useCallback((appointmentId: string) => runVoid(() => supabase.rpc('cancel_customer_appointment', { appointment_id: appointmentId }) as never), [runVoid]);
  const cancelBarber = useCallback((appointmentId: string) => runVoid(() => supabase.rpc('cancel_barber_appointment', { appointment_id: appointmentId }) as never), [runVoid]);
  const markPresent = useCallback((appointmentId: string) => run(() => supabase.rpc('mark_appointment_present', { appointment_id: appointmentId }) as never), [run]);
  const today = useCallback(() => run(() => supabase.rpc('barber_today_appointments') as never), [run]);
  return { loading, error, clearError: () => setError(''), searchBarbers: searchBarbers as (query: string, city?: string) => Promise<readonly BarberSummary[] | null>, getBarber: getBarber as (id: string) => Promise<readonly BarberProfile[] | null>, getSlots: getSlots as (barberId: string, serviceId: string, date: string) => Promise<readonly BookingSlot[] | null>, book, reschedule, cancelCustomer, cancelBarber, markPresent, today: today as () => Promise<readonly TodayAppointment[] | null> };
}

export async function loadCustomerAppointments(): Promise<readonly Appointment[]> {
  const { data, error } = await supabase.from('appointments').select('id,starts_at,ends_at,price_dzd,status,services(name),profiles!appointments_barber_id_fkey(name)').order('starts_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((item: any) => ({ id: item.id, starts_at: item.starts_at, ends_at: item.ends_at, price_dzd: item.price_dzd, status: item.status, service_name: item.services?.name ?? '', barber_name: item.profiles?.name }));
}
