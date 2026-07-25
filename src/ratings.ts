import type { AppointmentStatus } from '@/src/booking';

export interface AppointmentRating {
  readonly id: string;
  readonly stars: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export function isValidStarRating(stars: number): boolean {
  return Number.isInteger(stars) && stars >= 1 && stars <= 5;
}

export function canRateAppointment(status: AppointmentStatus, rating?: AppointmentRating | null): boolean {
  return status === 'completed' && !rating;
}

export function canEditRating(rating: AppointmentRating | null | undefined, now = Date.now()): boolean {
  if (!rating) return false;
  return now - new Date(rating.created_at).getTime() <= 24 * 60 * 60 * 1000;
}

export function ratingSummaryLabel(average: number, count: number): string {
  if (!count) return 'لا توجد تقييمات بعد';
  const rounded = Math.round(average * 10) / 10;
  return `${rounded} ★ (${count})`;
}
