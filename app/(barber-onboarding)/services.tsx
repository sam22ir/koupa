import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { PrimaryButton } from '@/src/components/atoms/PrimaryButton';
import { OnboardingBrandHeader } from '@/src/components/molecules/OnboardingBrandHeader';
import { ProgressHeader } from '@/src/components/molecules/ProgressHeader';
import { ScreenHeader } from '@/src/components/molecules/ScreenHeader';
import { ServiceEditor } from '@/src/components/molecules/ServiceEditor';
import { Screen } from '@/src/components/organisms/Screen';
import { copy } from '@/src/data/copy';
import type { ServiceDraft } from '@/src/data/onboarding';
import { useBarberOnboardingGuard, useOnboarding } from '@/src/hooks/useOnboarding';
import { useSession } from '@/src/hooks/useSession';
import { colors, radii, spacing, typography } from '@/src/theme';

export interface BarberServicesProps {}
export default function BarberServices(_: BarberServicesProps) {
  const { session, loading: sessionLoading } = useSession(); const { draft, draftStep, setDraft, saveDraft, saving, hydrating } = useOnboarding({ userId: session?.user.id }); const redirecting = useBarberOnboardingGuard(draftStep, sessionLoading || hydrating, 3); const [error, setError] = useState('');
  const changeService = (index: number, service: ServiceDraft) => setDraft({ ...draft, services: draft.services.map((item, itemIndex) => itemIndex === index ? service : item) });
  const addService = () => setDraft({ ...draft, services: [...draft.services, { name: '', priceDzd: '', durationMinutes: '30' }] });
  const removeService = (index: number) => setDraft({ ...draft, services: draft.services.filter((_, itemIndex) => itemIndex !== index) });
  const next = async () => { if (!draft.services.length || draft.services.some((service) => !service.name || !Number(service.priceDzd) || !Number(service.durationMinutes))) return setError(copy.common.validation); try { await saveDraft(3, draft); router.push('/(barber-onboarding)/schedule'); } catch { setError(copy.auth.failed); } };
  return <Screen><ScreenHeader onBack={() => router.back()} /><OnboardingBrandHeader compact /><ProgressHeader step={3} title={copy.barber.services.title} />{sessionLoading || hydrating || redirecting ? <Text style={styles.loading}>{copy.common.loading}</Text> : <>{draft.services.map((service, index) => <ServiceEditor key={`${service.name}-${index}`} service={service} index={index} removable={draft.services.length > 1} onChange={(nextService) => { changeService(index, nextService); setError(''); }} onRemove={() => removeService(index)} />)}<Pressable accessibilityRole="button" accessibilityLabel={copy.barber.services.add} onPress={addService} style={styles.add}><Text style={styles.addText}>{copy.barber.services.add}</Text></Pressable>{error ? <Text style={styles.error}>{error}</Text> : null}<PrimaryButton label={copy.barber.next} onPress={() => void next()} loading={saving} /></>}</Screen>;
}
const styles = StyleSheet.create({ add: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radii.xl, paddingVertical: spacing.sm }, addText: { color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body }, loading: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, textAlign: 'center' }, error: { color: colors.danger, fontFamily: typography.fontFamily.regular, fontSize: typography.size.caption, textAlign: 'right' } });
