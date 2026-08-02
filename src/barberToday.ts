import type { TodayAppointment } from '@/src/booking';

export type TodayDashboardCounts = {
  readonly upcoming: number;
  readonly present: number;
  readonly completed: number;
};

export function getTodayDashboard(items: readonly TodayAppointment[]): {
  readonly counts: TodayDashboardCounts;
  readonly appointments: readonly TodayAppointment[];
} {
  let upcoming = 0;
  let present = 0;
  let completed = 0;

  for (const item of items) {
    if (item.status === 'booked') upcoming += 1;
    if (item.status === 'present') present += 1;
    if (item.status === 'completed') completed += 1;
  }

  return {
    counts: { upcoming, present, completed },
    appointments: [...items].sort(
      (left, right) =>
        new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime(),
    ),
  };
}

export function getTodayDurationMinutes(item: TodayAppointment): number {
  return Math.max(
    0,
    Math.round(
      (new Date(item.ends_at).getTime() - new Date(item.starts_at).getTime()) / 60_000,
    ),
  );
}

export function getCustomerInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('');
}
