import type { Appointment, AppointmentStatus } from '@/src/booking';

export interface AppointmentGroups {
  readonly upcoming: readonly Appointment[];
  readonly past: readonly Appointment[];
}

const upcomingStatuses = new Set<AppointmentStatus>(['booked', 'present']);
const pastStatuses = new Set<AppointmentStatus>(['completed', 'absent', 'cancelled']);

function dateValue(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function splitAppointments(appointments: readonly Appointment[]): AppointmentGroups {
  const upcoming = appointments.filter((item) => upcomingStatuses.has(item.status));
  const past = appointments.filter((item) => pastStatuses.has(item.status));

  return {
    upcoming: [...upcoming].sort((a, b) => dateValue(a.starts_at) - dateValue(b.starts_at)),
    past: [...past].sort((a, b) => dateValue(b.starts_at) - dateValue(a.starts_at)),
  };
}
