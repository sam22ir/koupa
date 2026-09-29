import { supabase } from '@/lib/supabase';
import type { BarberDraft, UserRole } from '@/src/data/onboarding';
import { errorCode, toAppError } from '@/src/services/errors';
import { loadProfile } from '@/src/services/profile';
import {
  fromPersistedOnboardingStep,
  toPersistedOnboardingStep,
} from '@/src/onboardingValidation';
import type { Json } from '@/src/types/database';

export async function loadOnboardingDraft(userId: string): Promise<{ draft: Partial<BarberDraft> | null; step: number }> {
  const { data, error } = await supabase
    .from('onboarding_drafts')
    .select('data,step')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw toAppError(error);
  return {
    draft: (data?.data as Partial<BarberDraft> | null) ?? null,
    step: fromPersistedOnboardingStep(data?.step ?? 0),
  };
}

export async function saveOnboardingDraft(userId: string, step: number, draft: BarberDraft): Promise<void> {
  const { error } = await supabase.from('onboarding_drafts').upsert(
    {
      user_id: userId,
      role: 'barber',
      step: toPersistedOnboardingStep(step),
      data: draft as unknown as Json,
    },
    { onConflict: 'user_id' },
  );
  if (error) throw toAppError(error);
}

/**
 * Runs a profile creation and, when the phone number is already taken, tries to
 * free it once: a number held by an unconfirmed account with no history is
 * released to a confirmed claimant (see claim_unverified_phone). Anything else
 * keeps the original error, so the customer still sees "number already linked"
 * when a real account owns it.
 */
export async function withPhoneRelease<T>(phone: string, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (errorCode(error) !== 'PHONE_ALREADY_IN_USE') throw error;
    let released = false;
    try {
      released = await claimUnverifiedPhone(phone);
    } catch {
      // Not confirmed yet, or the claim was refused: fall through to the original error.
      released = false;
    }
    if (!released) throw error;
    return action();
  }
}

export function createCustomerProfile(
  userId: string,
  name: string,
  phone: string,
  city?: string,
): Promise<void> {
  return withPhoneRelease(phone, () => insertCustomerProfile(userId, name, phone, city));
}

async function insertCustomerProfile(
  userId: string,
  name: string,
  phone: string,
  city?: string,
): Promise<void> {
  const trimmedCity = city?.trim();
  const { error } = await supabase.from('profiles').insert({
    id: userId,
    role: 'customer' satisfies UserRole,
    name,
    phone,
    ...(trimmedCity ? { city: trimmedCity } : {}),
  });
  if (!error) return;
  // The insert may have committed even if the following profile refresh
  // failed. Treat a duplicate retry as success only for this same customer
  // account; never hide a role conflict.
  if (error.code === '23505' || /duplicate|already exists/i.test(error.message ?? '')) {
    const existing = await loadProfile(userId);
    if (existing?.role === 'customer') return;
  }
  throw toAppError(error);
}

/**
 * Phase one of barber setup: a real but unpublished account, created as soon
 * as identity and location are known. Services and working hours become
 * in-app tasks afterwards, so quitting here no longer loses the account.
 */
export function createBarberProfile(draft: BarberDraft): Promise<void> {
  return withPhoneRelease(draft.phone, () => insertBarberProfile(draft));
}

async function insertBarberProfile(draft: BarberDraft): Promise<void> {
  const payload = {
    name: draft.name,
    phone: draft.phone,
    bio: draft.bio,
    workplace_type: draft.workplaceType,
    shop_name: draft.workplaceType === 'owner' ? draft.shopName : null,
    shop_bio: draft.workplaceType === 'owner' ? draft.shopBio : null,
    city: draft.city,
    neighborhood: draft.neighborhood,
    maps_url: draft.mapsUrl,
    latitude: draft.latitude,
    longitude: draft.longitude,
  };

  const { error } = await supabase.rpc('create_barber_profile', {
    payload: payload as unknown as Json,
  });
  if (error) throw toAppError(error);
}

/**
 * Release a phone number held by an unverified, unused account so the real
 * owner is not locked out. Returns true when the number was freed.
 */
export async function claimUnverifiedPhone(phone: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('claim_unverified_phone', {
    target_phone: phone,
  });
  if (error) throw toAppError(error);
  return data === true;
}

/**
 * Phase two: publish an existing unpublished barber. Identity, workplace type
 * and location come from the stored row, so this payload carries only what
 * publication itself needs.
 */
export interface BarberPublishReadiness {
  readonly hasServices: boolean;
  readonly hasWorkingHours: boolean;
}

/** What still blocks publication, read from what the barber has actually saved. */
export async function loadBarberPublishReadiness(userId: string): Promise<BarberPublishReadiness> {
  const [servicesResult, schedulesResult] = await Promise.all([
    supabase.from('services').select('id').eq('barber_id', userId).eq('is_active', true).limit(1),
    supabase.from('weekly_schedules').select('id').eq('barber_id', userId).limit(1),
  ]);
  if (servicesResult.error) throw toAppError(servicesResult.error);
  if (schedulesResult.error) throw toAppError(schedulesResult.error);
  return {
    hasServices: (servicesResult.data ?? []).length > 0,
    hasWorkingHours: (schedulesResult.data ?? []).length > 0,
  };
}

/** Publish what the barber already saved in the app. */
export async function publishExistingBarberProfile(): Promise<void> {
  const { error } = await supabase.rpc('publish_barber_profile', {
    payload: {} as unknown as Json,
  });
  if (error) throw toAppError(error);
}

export async function publishBarberProfile(draft: BarberDraft): Promise<void> {
  const payload = {
    bio: draft.bio,
    shop_name: draft.workplaceType === 'owner' ? draft.shopName : null,
    shop_bio: draft.workplaceType === 'owner' ? draft.shopBio : null,
    interval_minutes: draft.intervalMinutes,
    services: draft.services
      .filter((service) => service.name && service.priceDzd && service.durationMinutes)
      .map((service) => ({
        name: service.name,
        price_dzd: Number(service.priceDzd),
        duration_minutes: Number(service.durationMinutes),
      })),
    schedules: draft.schedules.map((schedule) => ({
      day_of_week: schedule.dayOfWeek,
      enabled: schedule.enabled,
      starts_at: schedule.startsAt,
      ends_at: schedule.endsAt,
      breaks: schedule.breaks.map((item) => ({
        starts_at: item.startsAt,
        ends_at: item.endsAt,
      })),
    })),
  };

  const { error } = await supabase.rpc('publish_barber_profile', {
    payload: payload as unknown as Json,
  });
  if (error) throw toAppError(error);
}
