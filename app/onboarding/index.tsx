import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getSignupName, getSignupPhone } from '@/src/auth';
import { AuthHeader, Button, ErrorBanner, Field, Screen } from '@/src/components/ui';
import { OnboardingLocationStep } from '@/src/components/onboarding/OnboardingLocationStep';
import { WorkplaceChoice } from '@/src/components/onboarding/WorkplaceChoice';
import { useOnboarding } from '@/src/hooks/useOnboarding';
import { t } from '@/src/i18n';
import { markBarberOnboardingHintsPending } from '@/src/navigation/barberActivation';
import {
  validateBarberOnboardingStep,
  type BarberOnboardingError,
} from '@/src/onboardingValidation';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, radii, space, typography } from '@/src/theme';

/**
 * Setup only collects what the account cannot exist without. Services and
 * working hours are finished from the Schedule tab afterwards, so leaving here
 * never discards the account.
 */
type SetupStep = 0 | 1;

const steps = [t('barber.stepBasic'), t('barber.stepLocation')] as const;

const stepBodies: Record<SetupStep, string> = {
  0: t('onboarding.stepBodyBasic'),
  1: t('onboarding.stepBodyLocation'),
};

const validationCopy: Record<BarberOnboardingError, string> = {
  basic: t('onboarding.validationBasic'),
  location: t('onboarding.validationLocation'),
  services: t('onboarding.validationServices'),
  schedule: t('onboarding.validationSchedule'),
};

export default function BarberOnboardingScreen() {
  const { session, refreshProfile, signOut } = useAppSession();
  const onboarding = useOnboarding({
    userId: session?.user.id,
    initialPhone: getSignupPhone(session?.user ?? null) ?? session?.user.phone,
    initialName: getSignupName(session?.user ?? null),
  });
  const [step, setStep] = useState<SetupStep>(
    Math.min(1, onboarding.draftStep || 0) as SetupStep,
  );
  const syncedDraftStep = useRef(false);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [exiting, setExiting] = useState(false);
  const draft = onboarding.draft;

  const title = useMemo(() => steps[step] ?? t('barber.onboarding'), [step]);
  const stageBody = useMemo(() => {
    if (step === 1 && draft.workplaceType === 'worker') return t('onboarding.stepBodyLocationWorker');
    return stepBodies[step] ?? t('barber.onboardingBody');
  }, [draft.workplaceType, step]);

  useEffect(() => {
    if (onboarding.hydrating) {
      syncedDraftStep.current = false;
      return;
    }
    if (syncedDraftStep.current) return;
    syncedDraftStep.current = true;
    // Drafts saved by the previous five-step wizard can carry a later step.
    setStep(Math.min(1, onboarding.draftStep) as SetupStep);
  }, [onboarding.draftStep, onboarding.hydrating]);

  const persist = async (nextStep: SetupStep) => {
    setError(null);
    if (nextStep > step) {
      const validation = validateBarberOnboardingStep(draft, step);
      if (validation) {
        setError(validationCopy[validation]);
        return;
      }
    }
    try {
      await onboarding.saveDraft(nextStep, draft);
      setStep(nextStep);
    } catch (caught) {
      setError(caught);
    }
  };

  /**
   * Creates the account as an unpublished barber. From here the profile is
   * real: services, hours and publishing happen inside the app.
   */
  const createProfile = async () => {
    setBusy(true);
    setError(null);
    try {
      for (const candidate of [0, 1] as const) {
        const validation = validateBarberOnboardingStep(draft, candidate);
        if (validation) {
          setStep(candidate);
          setError(validationCopy[validation]);
          return;
        }
      }
      await onboarding.createBarber(draft);
      await markBarberOnboardingHintsPending(draft.workplaceType);
      await refreshProfile();
      router.replace('/(barber)/today');
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    if (step === 0) return;
    setError(null);
    setStep(0);
  };

  const exitAccount = async () => {
    setExiting(true);
    setError(null);
    try {
      await signOut();
      router.replace('/(auth)/welcome');
    } catch (caught) {
      setError(caught);
    } finally {
      setExiting(false);
    }
  };

  return (
    <Screen scroll loading={onboarding.hydrating && !onboarding.loadError}>
      <AuthHeader showBack={false} progress={`${step + 1}/2`} />
      <View style={styles.stageHeader}>
        <Text style={styles.stageKicker}>{t('barber.onboarding')}</Text>
        <Text style={styles.stageTitle}>{title}</Text>
        <Text style={styles.stageBody}>{stageBody}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('auth.changeAccount')}
          disabled={exiting || busy || onboarding.saving}
          onPress={() => void exitAccount()}
          style={styles.changeAccount}
        >
          <Text style={styles.changeAccountText}>{t('auth.changeAccount')}</Text>
        </Pressable>
      </View>
      <ErrorBanner error={error || onboarding.saveError || onboarding.loadError} />
      {onboarding.loadError ? (
        <Button label={t('common.retry')} variant="secondary" onPress={() => void onboarding.retryLoad()} />
      ) : null}
      {onboarding.saveError ? (
        <Button label={t('common.retry')} variant="secondary" onPress={() => void onboarding.retrySave()} />
      ) : null}

      {step === 0 ? (
        <View style={styles.block}>
          <View style={styles.intro}>
            <Text style={styles.introTitle}>{t('onboarding.basicIntroTitle')}</Text>
            <Text style={styles.introBody}>{t('onboarding.basicIntroBody')}</Text>
          </View>
          <Field label={t('auth.name')} value={draft.name} onChangeText={(name) => onboarding.setDraft({ ...draft, name })} />
          <Field
            label={t('auth.phone')}
            value={draft.phone}
            onChangeText={(phone) => onboarding.setDraft({ ...draft, phone })}
            hint={t('auth.phoneHint')}
            keyboardType="phone-pad"
          />
          <Field label={t('onboarding.shortBio')} value={draft.bio} onChangeText={(bio) => onboarding.setDraft({ ...draft, bio })} multiline />
          <View style={styles.dividerBlock}>
            <Text style={styles.dividerTitle}>{t('onboarding.workplaceSection')}</Text>
            <WorkplaceChoice
              value={draft.workplaceType}
              onChange={(workplaceType) => onboarding.setDraft({
                ...draft,
                workplaceType,
                ...(workplaceType === 'worker' ? { shopName: '', shopBio: '' } : {}),
                ...(workplaceType === 'worker' ? { city: '', neighborhood: '', mapsUrl: '', latitude: '', longitude: '' } : {}),
              })}
            />
          </View>
          {draft.workplaceType === 'owner' ? (
            <>
              <Field
                label={t('onboarding.shopName')}
                value={draft.shopName}
                onChangeText={(shopName) => onboarding.setDraft({ ...draft, shopName })}
              />
              <Field
                label={t('onboarding.shopBio')}
                value={draft.shopBio}
                onChangeText={(shopBio) => onboarding.setDraft({ ...draft, shopBio })}
                multiline
              />
            </>
          ) : null}
        </View>
      ) : null}

      {step === 1 ? (
        <OnboardingLocationStep draft={draft} onChange={(next) => onboarding.setDraft({ ...draft, ...next })} />
      ) : null}

      {step === 1 ? <Text style={styles.publishHint}>{t('onboarding.createProfileHint')}</Text> : null}

      <View style={styles.nav}>
        {step > 0 ? (
          <Button label={t('common.back')} variant="secondary" disabled={exiting} onPress={goBack} />
        ) : null}
        {step === 0 ? (
          <Button
            label={t('common.next')}
            onPress={() => void persist(1)}
            loading={onboarding.saving}
            disabled={exiting}
          />
        ) : (
          <Button
            label={t('onboarding.createProfile')}
            onPress={() => void createProfile()}
            loading={busy || onboarding.saving}
            disabled={exiting}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stageHeader: { gap: space[1], alignItems: 'flex-end' },
  stageKicker: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  stageTitle: { ...typography.title, color: colors.text, textAlign: 'right' },
  stageBody: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  changeAccount: {
    minHeight: 44,
    justifyContent: 'center',
    marginTop: space[1],
  },
  changeAccountText: {
    ...typography.label,
    color: colors.primary,
    textAlign: 'right',
    textDecorationLine: 'underline',
  },
  block: {
    gap: space[3],
  },
  intro: { gap: space[1], alignItems: 'flex-end' },
  introTitle: { ...typography.titleSm, textAlign: 'right' },
  introBody: { ...typography.caption, textAlign: 'right' },
  dividerBlock: {
    gap: space[2],
    marginTop: space[1],
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dividerTitle: {
    ...typography.bodyStrong,
    textAlign: 'right',
  },
  presetsLabel: {
    ...typography.label,
    textAlign: 'right',
  },
  chipRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: space[2],
  },
  nav: {
    gap: space[3],
    marginTop: space[2],
  },
  intervalBlock: {
    gap: space[2],
  },
  intervalLabel: {
    ...typography.bodyStrong,
    textAlign: 'right',
  },
  publishHint: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.textMuted,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.lg,
    padding: space[3],
  },
});
