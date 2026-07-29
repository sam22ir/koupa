export interface BarberSummary {
  readonly id: string;
  readonly name: string;
  readonly bio: string | null;
  readonly city: string | null;
  readonly neighborhood: string | null;
  readonly maps_url: string | null;
  readonly phone: string;
  readonly average_rating: number;
  readonly rating_count: number;
  readonly starting_price_dzd: number;
  readonly service_count: number;
}
export interface BarberService { readonly id: string; readonly name: string; readonly price_dzd: number; readonly duration_minutes: number; }
export interface BarberProfile extends Omit<BarberSummary, 'phone'> {
  readonly phone: string;
  readonly booking_window_days: number;
  readonly average_rating: number;
  readonly rating_count: number;
  readonly services: readonly BarberService[];
  readonly weekly_hours: readonly { readonly day_of_week: number; readonly starts_at: string; readonly ends_at: string; }[];
}
export interface BookingSlot { readonly starts_at: string; readonly ends_at: string; }
export type AppointmentStatus = 'booked' | 'present' | 'completed' | 'absent' | 'cancelled';
export interface Appointment {
  readonly id: string;
  readonly barber_id: string;
  readonly service_id: string;
  readonly starts_at: string;
  readonly ends_at: string;
  readonly price_dzd: number;
  readonly status: AppointmentStatus;
  readonly service_name: string;
  readonly barber_name?: string;
  readonly location_maps_url?: string | null;
  readonly rating?: import('@/src/ratings').AppointmentRating | null;
}
export interface TodayAppointment {
  readonly id: string;
  readonly starts_at: string;
  readonly ends_at: string;
  readonly price_dzd: number;
  readonly status: AppointmentStatus;
  readonly service_name: string;
  readonly customer_name: string;
  readonly customer_phone: string;
  readonly qr_check_in_reversible?: boolean;
}

export function algeriaDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function bookingDates(days: number): readonly string[] {
  const start = new Date(`${algeriaDate()}T12:00:00Z`);
  return Array.from({ length: Math.max(1, Math.min(days + 1, 31)) }, (_, index) => {
    const date = new Date(start); date.setUTCDate(start.getUTCDate() + index); return date.toISOString().slice(0, 10);
  });
}

export function formatBookingTime(value: string): string {
  return new Intl.DateTimeFormat('ar-DZ', { timeZone: 'Africa/Algiers', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function formatBookingDate(value: string): string {
  return new Intl.DateTimeFormat('ar-DZ', { timeZone: 'Africa/Algiers', weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${value}T12:00:00Z`));
}

export function canCancelCustomerAppointment(startsAt: string, now = Date.now()): boolean {
  return new Date(startsAt).getTime() - now >= 2 * 60 * 60 * 1000;
}

export function canRescheduleCustomerAppointment(status: AppointmentStatus): boolean {
  return status === 'booked';
}

export function appointmentStatusLabel(status: AppointmentStatus): string {
  switch (status) {
    case 'booked':
      return 'محجوز';
    case 'present':
      return 'حاضر';
    case 'completed':
      return 'مكتمل';
    case 'absent':
      return 'غائب';
    case 'cancelled':
      return 'ملغى';
  }
}

export function formatAppointmentWhen(startsAt: string): string {
  const date = new Intl.DateTimeFormat('ar-DZ', {
    timeZone: 'Africa/Algiers',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(startsAt));
  return `${date} - ${formatBookingTime(startsAt)}`;
}
