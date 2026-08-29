import { supabase } from '@/lib/supabase';
import type { BarberDraft, UserRole } from '@/src/data/onboarding';
import { toAppError } from '@/src/services/errors';
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

export async function createCustomerProfile(
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

export async function publishBarberProfile(draft: BarberDraft): Promise<void> {
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
