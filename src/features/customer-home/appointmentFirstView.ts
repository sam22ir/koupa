import { canCancelCustomerAppointment, isCustomerCheckInOpen, type Appointment } from '@/src/booking';

export type AppointmentPrimaryKind = 'scan' | 'details';

export type AppointmentOverflowAction = 'directions' | 'reschedule' | 'cancel';

/** Scan is the only first-view primary when check-in is actually open. */
export function appointmentPrimaryKind(
  appointment: Pick<Appointment, 'status' | 'starts_at' | 'ends_at'>,
  now = Date.now(),
): AppointmentPrimaryKind {
  return isCustomerCheckInOpen(appointment, now) ? 'scan' : 'details';
}

export function appointmentOverflowActions(
  appointment: Pick<Appointment, 'status' | 'starts_at' | 'location_maps_url'>,
  now = Date.now(),
): readonly AppointmentOverflowAction[] {
  const actions: AppointmentOverflowAction[] = [];
  if (appointment.location_maps_url?.trim()) actions.push('directions');
  if (appointment.status === 'booked' && new Date(appointment.starts_at).getTime() > now) {
    actions.push('reschedule');
  }
  if (appointment.status === 'booked' && canCancelCustomerAppointment(appointment.starts_at, now)) {
    actions.push('cancel');
  }
  return actions;
}
