export type BookingStep = 'date' | 'slots' | 'recap';

export const bookingSteps: readonly BookingStep[] = ['date', 'slots', 'recap'];

export function nextBookingStep(step: BookingStep): BookingStep {
  if (step === 'date') return 'slots';
  return 'recap';
}

export function previousBookingStep(step: BookingStep): BookingStep {
  if (step === 'recap') return 'slots';
  return 'date';
}

export function canAdvanceBookingStep(
  step: BookingStep,
  selection: { readonly serviceId: string; readonly date: string; readonly slot: string },
): boolean {
  if (step === 'date') return Boolean(selection.serviceId && selection.date);
  if (step === 'slots') return Boolean(selection.slot);
  return Boolean(selection.serviceId && selection.date && selection.slot);
}
