import { useState } from 'react';
import { router } from 'expo-router';
import { PrimaryButton } from '@/src/components/atoms/PrimaryButton';
import { FormField } from '@/src/components/molecules/FormField';
import { OnboardingBrandHeader } from '@/src/components/molecules/OnboardingBrandHeader';
import { ProgressHeader } from '@/src/components/molecules/ProgressHeader';
import { ScreenHeader } from '@/src/components/molecules/ScreenHeader';
import { Screen } from '@/src/components/organisms/Screen';
import { copy } from '@/src/data/copy';
import { useBarberOnboardingGuard, useOnboarding } from '@/src/hooks/useOnboarding';
import { useSession } from '@/src/hooks/useSession';

export interface BarberBasicProps {}
export default function BarberBasic(_: BarberBasicProps) {
  const { session, loading: sessionLoading } = useSession(); const { draft, draftStep, setDraft, saveDraft, saving, hydrating } = useOnboarding({ userId: session?.user.id }); const redirecting = useBarberOnboardingGuard(draftStep, sessionLoading || hydrating, 1); const [error, setError] = useState('');
  const next = async () => { if (draft.name.trim().length < 2 || !/^(?:\+213|0)(5|6|7)\d{8}$/.test(draft.phone.replace(/[\s-]/g, ''))) return setError(copy.common.validation); try { await saveDraft(1, draft); router.push('/(barber-onboarding)/location'); } catch { setError(copy.auth.failed); } };
  return <Screen><ScreenHeader onBack={() => router.back()} /><OnboardingBrandHeader /><ProgressHeader step={1} title={copy.barber.basic.title} />{sessionLoading || hydrating || redirecting ? null : <><FormField label={copy.barber.basic.name} value={draft.name} onChangeText={(name) => { setDraft({ ...draft, name }); setError(''); }} error={error} /><FormField label={copy.barber.basic.phone} value={draft.phone} onChangeText={(phone) => { setDraft({ ...draft, phone }); setError(''); }} keyboardType="phone-pad" /><FormField label={copy.barber.basic.bio} value={draft.bio} onChangeText={(bio) => setDraft({ ...draft, bio })} multiline /><PrimaryButton label={copy.barber.next} onPress={() => void next()} loading={saving} /></>}</Screen>;
}
