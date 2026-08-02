import type { Appointment } from '@/src/booking';

export interface RecentBarber {
  readonly barberId: string;
  readonly barberName: string;
  readonly lastVisitedAt: string;
}

export function deriveRecentBarbers(
  appointments: readonly Appointment[],
  limit = 3,
): readonly RecentBarber[] {
  const latestByBarber = new Map<string, RecentBarber>();

  for (const item of appointments) {
    if (item.status !== 'completed' || !item.barber_id) continue;
    const previous = latestByBarber.get(item.barber_id);
    if (previous && new Date(previous.lastVisitedAt).getTime() >= new Date(item.starts_at).getTime()) continue;
    latestByBarber.set(item.barber_id, {
      barberId: item.barber_id,
      barberName: item.barber_name?.trim() || 'حلاق',
      lastVisitedAt: item.starts_at,
    });
  }

  return [...latestByBarber.values()]
    .sort((a, b) => new Date(b.lastVisitedAt).getTime() - new Date(a.lastVisitedAt).getTime())
    .slice(0, Math.max(0, limit));
}
