import { useState } from 'react';
import { router } from 'expo-router';
import { PrimaryButton } from '@/src/components/atoms/PrimaryButton';
import { FormField } from '@/src/components/molecules/FormField';
import { LocationPreview } from '@/src/components/molecules/LocationPreview';
import { OnboardingBrandHeader } from '@/src/components/molecules/OnboardingBrandHeader';
import { ProgressHeader } from '@/src/components/molecules/ProgressHeader';
import { ScreenHeader } from '@/src/components/molecules/ScreenHeader';
import { Screen } from '@/src/components/organisms/Screen';
import { copy } from '@/src/data/copy';
import { useBarberOnboardingGuard, useOnboarding } from '@/src/hooks/useOnboarding';
import { useSession } from '@/src/hooks/useSession';

export interface BarberLocationProps {}
export default function BarberLocation(_: BarberLocationProps) {
  const { session, loading: sessionLoading } = useSession(); const { draft, draftStep, setDraft, saveDraft, saving, hydrating } = useOnboarding({ userId: session?.user.id }); const redirecting = useBarberOnboardingGuard(draftStep, sessionLoading || hydrating, 2); const [error, setError] = useState(''); const hasLocation = Boolean(draft.mapsUrl || (draft.latitude && draft.longitude));
  const next = async () => { if (!hasLocation) return setError(copy.common.locationRequired); try { await saveDraft(2, draft); router.push('/(barber-onboarding)/services'); } catch { setError(copy.auth.failed); } };
  return <Screen><ScreenHeader onBack={() => router.back()} /><OnboardingBrandHeader compact /><ProgressHeader step={2} title={copy.barber.location.title} />{sessionLoading || hydrating || redirecting ? null : <><FormField label={copy.barber.location.city} value={draft.city} onChangeText={(city) => setDraft({ ...draft, city })} /><FormField label={copy.barber.location.neighborhood} value={draft.neighborhood} onChangeText={(neighborhood) => setDraft({ ...draft, neighborhood })} /><FormField label={copy.barber.location.mapsUrl} value={draft.mapsUrl} onChangeText={(mapsUrl) => { setDraft({ ...draft, mapsUrl }); setError(''); }} keyboardType="url" error={error} /><FormField label={copy.barber.location.latitude} value={draft.latitude} onChangeText={(latitude) => { setDraft({ ...draft, latitude }); setError(''); }} keyboardType="numeric" /><FormField label={copy.barber.location.longitude} value={draft.longitude} onChangeText={(longitude) => { setDraft({ ...draft, longitude }); setError(''); }} keyboardType="numeric" /><LocationPreview hasLocation={hasLocation} /><PrimaryButton label={copy.barber.next} onPress={() => void next()} loading={saving} /></>}</Screen>;
}
