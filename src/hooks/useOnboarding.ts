import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { defaultBarberDraft, type BarberDraft, type UserRole } from '@/src/data/onboarding';

export interface UseOnboardingProps { readonly userId?: string; }

const barberOnboardingPaths = ['/(barber-onboarding)/basic', '/(barber-onboarding)/location', '/(barber-onboarding)/services', '/(barber-onboarding)/schedule', '/(barber-onboarding)/review'] as const;

export function getNextBarberOnboardingPath(draftStep: number): typeof barberOnboardingPaths[number] {
  return barberOnboardingPaths[Math.min(Math.max(draftStep, 0), barberOnboardingPaths.length - 1)];
}

export function useBarberOnboardingGuard(draftStep: number, hydrating: boolean, targetStep: number): boolean {
  const redirecting = !hydrating && targetStep > draftStep + 1;
  useEffect(() => {
    if (redirecting) router.replace(getNextBarberOnboardingPath(draftStep));
  }, [draftStep, redirecting]);
  return redirecting;
}

export function useOnboarding({ userId }: UseOnboardingProps) {
  const [draft, setDraft] = useState<BarberDraft>(defaultBarberDraft);
  const [draftStep, setDraftStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [hydrating, setHydrating] = useState(Boolean(userId));
  useEffect(() => {
    if (!userId) { setHydrating(false); return; }
    setHydrating(true);
    void (async () => {
      const { data } = await supabase.from('onboarding_drafts').select('data,step').eq('user_id', userId).maybeSingle();
      if (data?.data) setDraft({ ...defaultBarberDraft, ...(data.data as Partial<BarberDraft>) });
      setDraftStep(data?.step ?? 0);
      setHydrating(false);
    })();
  }, [userId]);
  const saveDraft = useCallback(async (step: number, nextDraft: BarberDraft) => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from('onboarding_drafts').upsert({ user_id: userId, role: 'barber', step, data: nextDraft }, { onConflict: 'user_id' });
    setSaving(false); if (error) throw error; setDraftStep(step);
  }, [userId]);
  const createCustomer = useCallback(async (name: string, phone: string) => {
    if (!userId) throw new Error('No active session');
    const { error } = await supabase.from('profiles').insert({ id: userId, role: 'customer' satisfies UserRole, name, phone }); if (error) throw error;
  }, [userId]);
  const publishBarber = useCallback(async (nextDraft: BarberDraft) => {
    if (!userId) throw new Error('No active session');
    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('profiles')
      .select('role,is_published')
      .eq('id', userId)
      .maybeSingle();
    if (existingProfileError) throw existingProfileError;
    if (existingProfile) {
      if (existingProfile.role !== 'barber' || !existingProfile.is_published) {
        throw new Error('An incomplete or incompatible profile already exists');
      }
      const { error: draftError } = await supabase.from('onboarding_drafts').delete().eq('user_id', userId);
      if (draftError) throw draftError;
      return;
    }
    const coordinates = nextDraft.latitude && nextDraft.longitude ? { latitude: Number(nextDraft.latitude), longitude: Number(nextDraft.longitude) } : {};
    const { error: profileError } = await supabase.from('profiles').insert({ id: userId, role: 'barber' satisfies UserRole, name: nextDraft.name, phone: nextDraft.phone, bio: nextDraft.bio || null, city: nextDraft.city || null, neighborhood: nextDraft.neighborhood || null, maps_url: nextDraft.mapsUrl || null, ...coordinates, is_published: true });
    if (profileError) throw profileError;
    const services = nextDraft.services.filter((service) => service.name && service.priceDzd && service.durationMinutes).map((service) => ({ barber_id: userId, name: service.name, price_dzd: Number(service.priceDzd), duration_minutes: Number(service.durationMinutes) }));
    if (services.length) { const { error } = await supabase.from('services').insert(services); if (error) throw error; }
    const enabledSchedules = nextDraft.schedules.filter((schedule) => schedule.enabled);
    const schedules = enabledSchedules.map((schedule) => ({ barber_id: userId, day_of_week: schedule.dayOfWeek, starts_at: schedule.startsAt, ends_at: schedule.endsAt, interval_minutes: nextDraft.intervalMinutes }));
    const { data: insertedSchedules, error: scheduleError } = await supabase.from('weekly_schedules').insert(schedules).select('id,day_of_week'); if (scheduleError) throw scheduleError;
    const breaks = enabledSchedules.flatMap((schedule) => schedule.breaks.map((item) => ({ schedule_id: insertedSchedules?.find((inserted) => inserted.day_of_week === schedule.dayOfWeek)?.id, starts_at: item.startsAt, ends_at: item.endsAt }))).filter((item): item is { schedule_id: string; starts_at: string; ends_at: string } => Boolean(item.schedule_id));
    if (breaks.length) { const { error: breaksError } = await supabase.from('schedule_breaks').insert(breaks); if (breaksError) throw breaksError; }
    const { error: draftError } = await supabase.from('onboarding_drafts').delete().eq('user_id', userId);
    if (draftError) throw draftError;
  }, [userId]);
  return { draft, draftStep, setDraft, saving, hydrating, saveDraft, createCustomer, publishBarber };
}
