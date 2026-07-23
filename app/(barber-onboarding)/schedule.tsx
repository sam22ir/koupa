import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChoiceChip } from '@/src/components/atoms/ChoiceChip';
import { PrimaryButton } from '@/src/components/atoms/PrimaryButton';
import { OnboardingBrandHeader } from '@/src/components/molecules/OnboardingBrandHeader';
import { ProgressHeader } from '@/src/components/molecules/ProgressHeader';
import { ScheduleDayEditor } from '@/src/components/molecules/ScheduleDayEditor';
import { ScreenHeader } from '@/src/components/molecules/ScreenHeader';
import { Screen } from '@/src/components/organisms/Screen';
import { appointmentIntervals, copy } from '@/src/data/copy';
import type { DayScheduleDraft } from '@/src/data/onboarding';
import { useBarberOnboardingGuard, useOnboarding } from '@/src/hooks/useOnboarding';
import { useSession } from '@/src/hooks/useSession';
import { colors, spacing, typography } from '@/src/theme';

export interface BarberScheduleProps {}
export default function BarberSchedule(_: BarberScheduleProps) {
  const { session, loading: sessionLoading } = useSession(); const { draft, draftStep, setDraft, saveDraft, saving, hydrating } = useOnboarding({ userId: session?.user.id }); const redirecting = useBarberOnboardingGuard(draftStep, sessionLoading || hydrating, 4); const [error, setError] = useState('');
  const updateSchedule = (index: number, schedule: DayScheduleDraft) => setDraft({ ...draft, schedules: draft.schedules.map((item, itemIndex) => itemIndex === index ? schedule : item) });
  const next = async () => { const activeSchedules = draft.schedules.filter((schedule) => schedule.enabled); if (!activeSchedules.length || activeSchedules.some((schedule) => schedule.startsAt >= schedule.endsAt || schedule.breaks.some((item) => item.startsAt >= item.endsAt))) return setError(copy.common.invalidTime); try { await saveDraft(4, draft); router.push('/(barber-onboarding)/review'); } catch { setError(copy.auth.failed); } };
  return <Screen><ScreenHeader onBack={() => router.back()} /><OnboardingBrandHeader compact /><ProgressHeader step={4} title={copy.barber.schedule.title} />{sessionLoading || hydrating || redirecting ? <Text style={styles.loading}>{copy.common.loading}</Text> : <><Text style={styles.label}>{copy.barber.schedule.interval}</Text><View style={styles.choices}>{appointmentIntervals.map((interval) => <ChoiceChip key={interval} label={`${interval} ${copy.barber.schedule.minutes}`} selected={draft.intervalMinutes === interval} onPress={() => setDraft({ ...draft, intervalMinutes: interval })} />)}</View>{draft.schedules.map((schedule, index) => <ScheduleDayEditor key={schedule.dayOfWeek} schedule={schedule} onChange={(nextSchedule) => { updateSchedule(index, nextSchedule); setError(''); }} />)}{error ? <Text style={styles.error}>{error}</Text> : null}<PrimaryButton label={copy.barber.next} onPress={() => void next()} loading={saving} /></>}</Screen>;
}
const styles = StyleSheet.create({ label: { color: colors.charcoal, fontFamily: typography.fontFamily.medium, fontSize: typography.size.body, textAlign: 'right' }, choices: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm }, loading: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, textAlign: 'center' }, error: { color: colors.danger, fontFamily: typography.fontFamily.regular, fontSize: typography.size.caption, textAlign: 'right' } });
