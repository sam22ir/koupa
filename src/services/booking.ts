import { supabase } from '@/lib/supabase';
import type {
  Appointment,
  BarberShopProfile,
  BarberProfile,
  BarberService,
  BarberSummary,
  BookingSlot,
  BarberAppointmentEvent,
  TodayAppointment,
} from '@/src/booking';
import { mapCustomerAppointment } from '@/src/services/mappers/appointment';
import { SEARCH_PAGE_SIZE } from '@/src/services/mappers/schedule';
import { AppError, toAppError } from '@/src/services/errors';
import { parseCheckInResult, type CheckInResult } from '@/src/qr';
import type { Json } from '@/src/types/database';

function asServices(value: Json): readonly BarberService[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const row = item as Record<string, Json | undefined>;
    if (typeof row.id !== 'string' || typeof row.name !== 'string') return [];
    return [{
      id: row.id,
      name: row.name,
      price_dzd: Number(row.price_dzd ?? 0),
      duration_minutes: Number(row.duration_minutes ?? 0),
    }];
  });
}

function asWeeklyHours(value: Json): BarberProfile['weekly_hours'] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const row = item as Record<string, Json | undefined>;
    return [{
      day_of_week: Number(row.day_of_week ?? 0),
      starts_at: String(row.starts_at ?? ''),
      ends_at: String(row.ends_at ?? ''),
    }];
  });
}

function asShop(value: Json | null | undefined): BarberShopProfile | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, Json | undefined>;
  if (typeof row.id !== 'string' || typeof row.name !== 'string') return null;
  return {
    id: row.id,
    name: row.name,
    city: typeof row.city === 'string' ? row.city : null,
    neighborhood: typeof row.neighborhood === 'string' ? row.neighborhood : null,
    maps_url: typeof row.maps_url === 'string' ? row.maps_url : null,
    average_rating: Number(row.average_rating ?? 0),
    rating_count: Number(row.rating_count ?? 0),
  };
}

async function rpcData<T>(action: () => PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await action();
  if (error) throw toAppError(error);
  return data;
}

export async function searchBarbers(query: string, city = '', page = 0): Promise<readonly BarberSummary[]> {
  const data = await rpcData(() =>
    supabase.rpc('search_published_barbers', {
      search_query: query,
      city_query: city,
      page_number: page,
    }),
  );
  return (data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    bio: item.bio,
    city: item.city,
    neighborhood: item.neighborhood,
    maps_url: item.maps_url,
    phone: item.phone,
    average_rating: Number(item.average_rating ?? 0),
    rating_count: item.rating_count ?? 0,
    starting_price_dzd: item.starting_price_dzd ?? 0,
    service_count: item.service_count ?? 0,
  }));
}

export async function getBarber(barberId: string): Promise<readonly BarberProfile[]> {
  const data = await rpcData(() => supabase.rpc('get_public_barber_profile', { barber_id: barberId }));
  return (data ?? []).map((item) => {
    const services = asServices(item.services);
    return {
      id: item.id,
      name: item.name,
      bio: item.bio,
      city: item.city,
      neighborhood: item.neighborhood,
      maps_url: item.maps_url,
      phone: item.phone,
      booking_window_days: item.booking_window_days,
      average_rating: Number(item.average_rating ?? 0),
      rating_count: item.rating_count ?? 0,
      starting_price_dzd: services.length
        ? Math.min(...services.map((service) => service.price_dzd))
        : 0,
      service_count: services.length,
      services,
      weekly_hours: asWeeklyHours(item.weekly_hours),
      shop: asShop(item.shop),
    };
  });
}

export async function getSlots(barberId: string, serviceId: string, localDate: string): Promise<readonly BookingSlot[]> {
  const data = await rpcData(() =>
    supabase.rpc('available_booking_slots', {
      barber_id: barberId,
      service_id: serviceId,
      local_date: localDate,
    }),
  );
  return data ?? [];
}

export async function bookAppointment(barberId: string, serviceId: string, startsAt: string): Promise<string | null> {
  return rpcData(() =>
    supabase.rpc('book_appointment', {
      barber_id: barberId,
      service_id: serviceId,
      starts_at_value: startsAt,
    }),
  );
}

export async function rescheduleAppointment(appointmentId: string, serviceId: string, startsAt: string): Promise<string | null> {
  return rpcData(() =>
    supabase.rpc('reschedule_appointment', {
      appointment_id: appointmentId,
      service_id: serviceId,
      starts_at_value: startsAt,
    }),
  );
}

export async function cancelCustomerAppointment(appointmentId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_customer_appointment', { appointment_id: appointmentId });
  if (error) throw toAppError(error);
}

export async function cancelBarberAppointment(appointmentId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_barber_appointment', { appointment_id: appointmentId });
  if (error) throw toAppError(error);
}

export async function markAppointmentPresent(appointmentId: string): Promise<string | null> {
  return rpcData(() => supabase.rpc('mark_appointment_present', { appointment_id: appointmentId }));
}

export async function checkInWithQr(barberId: string): Promise<CheckInResult> {
  const data = await rpcData(() =>
    supabase.rpc('check_in_with_barber_qr', { target_barber_id: barberId }),
  );
  // Staging may still expose the pre-workflow RPC, which returns the
  // checked-in appointment UUID instead of the structured result object.
  if (typeof data === 'string') {
    return { code: 'CHECKED_IN', appointmentId: data };
  }
  return parseCheckInResult(data);
}

export async function undoQrCheckIn(appointmentId: string): Promise<string | null> {
  return rpcData(() =>
    supabase.rpc('undo_qr_check_in', { target_appointment_id: appointmentId }),
  );
}

export async function rateAppointment(appointmentId: string, stars: number): Promise<string | null> {
  return rpcData(() =>
    supabase.rpc('rate_appointment', {
      target_appointment_id: appointmentId,
      stars_value: stars,
    }),
  );
}

export async function barberTodayAppointments(): Promise<readonly TodayAppointment[]> {
  const data = await rpcData(() => supabase.rpc('barber_today_appointments'));
  return data ?? [];
}

export async function loadBarberAppointment(appointmentId: string): Promise<BarberAppointmentEvent | null> {
  const { data, error } = await supabase
    .rpc('barber_appointment_event', { target_appointment_id: appointmentId });
  if (error) {
    if (error.code !== 'PGRST202') throw toAppError(error);
    const legacy = await supabase
      .from('appointments')
      .select('id,starts_at,ends_at,price_dzd,status,services(name),profiles!appointments_customer_id_fkey(name,phone)')
      .eq('id', appointmentId)
      .maybeSingle();
    if (legacy.error) throw toAppError(legacy.error);
    if (!legacy.data) return null;
    const customer = Array.isArray(legacy.data.profiles) ? legacy.data.profiles[0] : legacy.data.profiles;
    const service = Array.isArray(legacy.data.services) ? legacy.data.services[0] : legacy.data.services;
    return {
      id: legacy.data.id,
      starts_at: legacy.data.starts_at,
      ends_at: legacy.data.ends_at,
      price_dzd: legacy.data.price_dzd,
      status: legacy.data.status,
      service_name: service?.name ?? '',
      customer_name: customer?.name ?? '',
      customer_phone: customer?.phone ?? '',
    };
  }
  const row = data?.[0];
  if (!row) return null;
  return {
    id: row.id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    price_dzd: row.price_dzd,
    status: row.status,
    service_name: row.service_name,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
  };
}

export async function loadCustomerAppointments(): Promise<readonly Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('id,barber_id,service_id,starts_at,ends_at,price_dzd,status,services(name),profiles!appointments_barber_id_fkey(name,maps_url),shops(name,maps_url),ratings(id,stars,created_at,updated_at)')
    .order('starts_at', { ascending: false });
  if (error) throw toAppError(error);
  return (data ?? []).map((row) => mapCustomerAppointment(row as never));
}

export function searchPageSize(): number {
  return SEARCH_PAGE_SIZE;
}

export function ensureAppError(error: unknown): AppError {
  return toAppError(error);
}
