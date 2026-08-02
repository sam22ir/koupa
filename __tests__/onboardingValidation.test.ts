import { defaultBarberDraft, type BarberDraft } from '@/src/data/onboarding';
import {
  firstInvalidBarberOnboardingStep,
  validateBarberOnboardingStep,
} from '@/src/onboardingValidation';
import {
  fromPersistedOnboardingStep,
  toPersistedOnboardingStep,
} from '@/src/onboardingValidation';

function validDraft(): BarberDraft {
  return {
    ...defaultBarberDraft,
    name: 'أمين',
    phone: '0555000000',
    city: 'الجزائر',
    neighborhood: 'باب الوادي',
    mapsUrl: 'https://maps.app.goo.gl/example',
    services: [{ name: 'حلاقة', priceDzd: '800', durationMinutes: '30' }],
    intervalMinutes: 15,
  };
}

describe('barber onboarding validation', () => {
  it('converts the screen zero-based step to the database one-based step', () => {
    expect(toPersistedOnboardingStep(0)).toBe(1);
    expect(toPersistedOnboardingStep(4)).toBe(5);
    expect(toPersistedOnboardingStep(-1)).toBe(1);
    expect(toPersistedOnboardingStep(99)).toBe(5);
    expect(fromPersistedOnboardingStep(1)).toBe(0);
    expect(fromPersistedOnboardingStep(5)).toBe(4);
    expect(fromPersistedOnboardingStep(0)).toBe(0);
  });
  it('validates basic identity and Algerian phone', () => {
    expect(validateBarberOnboardingStep({ ...validDraft(), name: '' }, 0)).toBe('basic');
    expect(validateBarberOnboardingStep({ ...validDraft(), phone: '123' }, 0)).toBe('basic');
    expect(validateBarberOnboardingStep(validDraft(), 0)).toBeNull();
  });

  it('accepts a Google Maps URL or valid coordinates', () => {
    expect(validateBarberOnboardingStep({ ...validDraft(), mapsUrl: 'https://example.com' }, 1)).toBe('location');
    expect(
      validateBarberOnboardingStep(
        { ...validDraft(), mapsUrl: '', latitude: '36.75', longitude: '3.05' },
        1,
      ),
    ).toBeNull();
  });

  it('requires a valid positive service in five-minute increments', () => {
    expect(validateBarberOnboardingStep({ ...validDraft(), services: [] }, 2)).toBe('services');
    expect(
      validateBarberOnboardingStep(
        { ...validDraft(), services: [{ name: 'حلاقة', priceDzd: '0', durationMinutes: '17' }] },
        2,
      ),
    ).toBe('services');
    expect(
      validateBarberOnboardingStep(
        { ...validDraft(), services: [{ name: 'حلاقة', priceDzd: '800.5', durationMinutes: '30' }] },
        2,
      ),
    ).toBe('services');
  });

  it('validates enabled working hours, breaks, and interval', () => {
    expect(validateBarberOnboardingStep({ ...validDraft(), intervalMinutes: 12 }, 3)).toBe('schedule');
    expect(
      validateBarberOnboardingStep(
        {
          ...validDraft(),
          schedules: validDraft().schedules.map((day) => ({ ...day, enabled: false })),
        },
        3,
      ),
    ).toBe('schedule');
    expect(validateBarberOnboardingStep(validDraft(), 3)).toBeNull();
  });

  it('returns the first invalid step before publication', () => {
    expect(firstInvalidBarberOnboardingStep({ ...validDraft(), name: '', mapsUrl: '' })).toBe(0);
    expect(firstInvalidBarberOnboardingStep(validDraft())).toBeNull();
  });
});
