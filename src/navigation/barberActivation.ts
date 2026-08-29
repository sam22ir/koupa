import { appStorage } from '@/lib/storage';

export const barberOnboardingHintsKey = 'koupa.barber.onboardingHints';

export type BarberActivationWorkplace = 'owner' | 'worker';

export async function markBarberOnboardingHintsPending(
  workplaceType: BarberActivationWorkplace = 'owner',
): Promise<void> {
  await appStorage.setItem(barberOnboardingHintsKey, workplaceType);
}

export async function readBarberOnboardingHints(): Promise<BarberActivationWorkplace | null> {
  const value = await appStorage.getItem(barberOnboardingHintsKey);
  return value === 'owner' || value === 'worker' ? value : null;
}

export async function clearBarberOnboardingHints(): Promise<void> {
  await appStorage.removeItem(barberOnboardingHintsKey);
}
