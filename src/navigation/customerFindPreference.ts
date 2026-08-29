import { appStorage } from '@/lib/storage';

export const customerFindCityKey = 'koupa.customer.findCity';

export async function setCustomerFindCityPreference(city: string): Promise<void> {
  const trimmed = city.trim();
  if (!trimmed) {
    await appStorage.removeItem(customerFindCityKey);
    return;
  }
  await appStorage.setItem(customerFindCityKey, trimmed);
}

/** Returns and clears a one-shot city preference for Find. */
export async function consumeCustomerFindCityPreference(): Promise<string | null> {
  const value = await appStorage.getItem(customerFindCityKey);
  if (!value?.trim()) return null;
  await appStorage.removeItem(customerFindCityKey);
  return value.trim();
}
