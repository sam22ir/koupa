import type { Appointment } from '@/src/booking';
import type { AppointmentRating } from '@/src/ratings';

type AppointmentQueryRow = {
  readonly id: string;
  readonly barber_id: string;
  readonly service_id: string;
  readonly starts_at: string;
  readonly ends_at: string;
  readonly price_dzd: number;
  readonly status: Appointment['status'];
  readonly services?: { readonly name?: string | null } | { readonly name?: string | null }[] | null;
  readonly profiles?: { readonly name?: string | null; readonly maps_url?: string | null } | { readonly name?: string | null; readonly maps_url?: string | null }[] | null;
  readonly shops?: { readonly name?: string | null; readonly maps_url?: string | null } | { readonly name?: string | null; readonly maps_url?: string | null }[] | null;
  readonly ratings?:
    | { readonly id: string; readonly stars: number; readonly created_at: string; readonly updated_at: string }
    | { readonly id: string; readonly stars: number; readonly created_at: string; readonly updated_at: string }[]
    | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function mapCustomerAppointment(row: AppointmentQueryRow): Appointment {
  const service = one(row.services);
  const profile = one(row.profiles);
  const shop = one(row.shops);
  const ratingRow = one(row.ratings);
  const rating: AppointmentRating | null = ratingRow
    ? {
        id: ratingRow.id,
        stars: ratingRow.stars,
        created_at: ratingRow.created_at,
        updated_at: ratingRow.updated_at,
      }
    : null;

  return {
    id: row.id,
    barber_id: row.barber_id,
    service_id: row.service_id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    price_dzd: row.price_dzd,
    status: row.status,
    service_name: service?.name ?? '',
    barber_name: profile?.name ?? undefined,
    shop_name: shop?.name ?? undefined,
    location_maps_url: shop?.maps_url ?? profile?.maps_url ?? null,
    rating,
  };
}
