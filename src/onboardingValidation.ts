import { isValidTime } from '@/src/barberSettings';
import { normalizeAlgerianPhone } from '@/src/auth';
import type { BarberDraft } from '@/src/data/onboarding';
import { bookingIntervalOptions } from '@/src/features/barber-schedule/model';

export type BarberOnboardingStep = 0 | 1 | 2 | 3 | 4;
export type BarberOnboardingError = 'basic' | 'location' | 'services' | 'schedule';

export function toPersistedOnboardingStep(screenStep: number): number {
  return Math.min(5, Math.max(1, Math.trunc(screenStep) + 1));
}

export function fromPersistedOnboardingStep(persistedStep: number): BarberOnboardingStep {
  if (!Number.isFinite(persistedStep) || persistedStep <= 0) return 0;
  return Math.min(4, Math.max(0, Math.trunc(persistedStep) - 1)) as BarberOnboardingStep;
}

const googleMapsHosts = new Set(['google.com', 'maps.google.com', 'www.google.com']);

function hasValidMapsUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    const hasShortLinkPath = host === 'goo.gl' && url.pathname.length > 1;
    const isGoogleMapsHost = googleMapsHosts.has(host) && url.pathname.includes('/maps');
    return (
      url.protocol === 'https:'
      && (host === 'maps.app.goo.gl' || hasShortLinkPath || isGoogleMapsHost)
    );
  } catch {
    return false;
  }
}

function hasValidServices(draft: BarberDraft): boolean {
  return draft.services.length > 0 && draft.services.every((service) => {
    const price = Number(service.priceDzd);
    const duration = Number(service.durationMinutes);
    return (
      service.name.trim().length >= 2
      && Number.isInteger(price)
      && price > 0
      && Number.isInteger(duration)
      && duration >= 5
      && duration <= 720
      && duration % 5 === 0
    );
  });
}

function hasValidSchedule(draft: BarberDraft): boolean {
  if (!bookingIntervalOptions.includes(draft.intervalMinutes as never)) return false;
  const enabled = draft.schedules.filter((day) => day.enabled);
  if (!enabled.length) return false;
  return enabled.every((day) => {
    if (!isValidTime(day.startsAt) || !isValidTime(day.endsAt) || day.startsAt >= day.endsAt) {
      return false;
    }
    const breaks = [...day.breaks].sort((left, right) => left.startsAt.localeCompare(right.startsAt));
    return breaks.every((item, index) => (
      isValidTime(item.startsAt)
      && isValidTime(item.endsAt)
      && item.startsAt < item.endsAt
      && item.startsAt >= day.startsAt
      && item.endsAt <= day.endsAt
      && (index === 0 || breaks[index - 1].endsAt <= item.startsAt)
    ));
  });
}

export function validateBarberOnboardingStep(
  draft: BarberDraft,
  step: BarberOnboardingStep,
): BarberOnboardingError | null {
  if (step === 0) {
    return draft.name.trim().length >= 2 && normalizeAlgerianPhone(draft.phone) ? null : 'basic';
  }
  if (step === 1) {
    if (draft.workplaceType === 'worker') return null;
    return draft.city.trim().length >= 2
      && draft.neighborhood.trim().length >= 2
      && hasValidMapsUrl(draft.mapsUrl)
      ? null
      : 'location';
  }
  if (step === 2) return hasValidServices(draft) ? null : 'services';
  if (step === 3) return hasValidSchedule(draft) ? null : 'schedule';
  return null;
}

export function firstInvalidBarberOnboardingStep(
  draft: BarberDraft,
): Exclude<BarberOnboardingStep, 4> | null {
  for (const step of [0, 1, 2, 3] as const) {
    if (validateBarberOnboardingStep(draft, step)) return step;
  }
  return null;
}
