import { useEffect } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/organisms/Screen';
import { copy } from '@/src/data/copy';
import { getNextBarberOnboardingPath, useOnboarding } from '@/src/hooks/useOnboarding';
import { useSession } from '@/src/hooks/useSession';
import { colors, typography } from '@/src/theme';

export default function BarberOnboardingResume() {
  const { session, loading } = useSession();
  const { draftStep, hydrating } = useOnboarding({ userId: session?.user.id });
  useEffect(() => { if (!loading && !hydrating) router.replace(getNextBarberOnboardingPath(draftStep)); }, [draftStep, hydrating, loading]);
  return <Screen scroll={false}><Text style={{ color: colors.muted, fontFamily: typography.fontFamily.regular, textAlign: 'center' }}>{copy.common.loading}</Text></Screen>;
}
