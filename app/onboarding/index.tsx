import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getSignupPhone } from '@/src/auth';
import { Button, Chip, ErrorBanner, Field, Screen } from '@/src/components/ui';
import { OnboardingLocationStep } from '@/src/components/onboarding/OnboardingLocationStep';
import { OnboardingReview } from '@/src/components/onboarding/OnboardingReview';
import { OnboardingServiceCard } from '@/src/components/onboarding/OnboardingServiceCard';
import { WorkplaceChoice } from '@/src/components/onboarding/WorkplaceChoice';
import {
  applySchedulePreset,
  applyServiceExample,
  serviceExamples,
  type SchedulePreset,
} from '@/src/data/onboarding';
import { AppointmentIntervalPicker } from '@/src/features/barber-schedule/AppointmentIntervalPicker';
import { WeeklyScheduleEditor } from '@/src/features/barber-schedule/WeeklyScheduleEditor';
import { useOnboarding } from '@/src/hooks/useOnboarding';
import { t } from '@/src/i18n';
import { markBarberOnboardingHintsPending } from '@/src/navigation/barberActivation';
import {
  firstInvalidBarberOnboardingStep,
  validateBarberOnboardingStep,
  type BarberOnboardingError,
  type BarberOnboardingStep,
} from '@/src/onboardingValidation';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, radii, space, typography } from '@/src/theme';

const steps = [
  t('barber.stepBasic'),
  t('barber.stepLocation'),
  t('barber.stepServices'),
  t('barber.stepHours'),
  t('barber.stepReview'),
] as const;

const stepBodies: Record<BarberOnboardingStep, string> = {
  0: t('onboarding.stepBodyBasic'),
  1: t('onboarding.stepBodyLocation'),
  2: t('onboarding.stepBodyServices'),
  3: t('onboarding.stepBodyHours'),
  4: t('onboarding.stepBodyReview'),
};

const validationCopy: Record<BarberOnboardingError, string> = {
  basic: t('onboarding.validationBasic'),
  location: t('onboarding.validationLocation'),
  services: t('onboarding.validationServices'),
  schedule: t('onboarding.validationSchedule'),
};

const schedulePresets: ReadonlyArray<{ readonly kind: SchedulePreset; readonly labelKey: string }> = [
  { kind: 'weekdays918', labelKey: 'onboarding.presetWeekdays' },
  { kind: 'longDays', labelKey: 'onboarding.presetLongDays' },
  { kind: 'default', labelKey: 'onboarding.presetDefault' },
];

export default function BarberOnboardingScreen() {
  const { session, refreshProfile, signOut } = useAppSession();
  const onboarding = useOnboarding({
    userId: session?.user.id,
    initialPhone: getSignupPhone(session?.user ?? null) ?? session?.user.phone,
  });
  const [step, setStep] = useState<BarberOnboardingStep>(
    (onboarding.draftStep || 0) as BarberOnboardingStep,
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
    setStep(onboarding.draftStep as BarberOnboardingStep);
  }, [onboarding.draftStep, onboarding.hydrating]);

  const persist = async (nextStep: BarberOnboardingStep) => {
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

  const publish = async () => {
    setBusy(true);
    setError(null);
    try {
      const invalidStep = firstInvalidBarberOnboardingStep(draft);
      if (invalidStep !== null) {
        const validation = validateBarberOnboardingStep(draft, invalidStep);
        setStep(invalidStep);
        setError(validation ? validationCopy[validation] : new Error(t('errors.VALIDATION')));
        return;
      }
      await onboarding.publishBarber(draft);
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
    setStep((step - 1) as BarberOnboardingStep);
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
      <View style={styles.stageHeader}>
        <Text style={styles.stageKicker}>{t('barber.onboarding')} · {step + 1}/5</Text>
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

      {step === 2 ? (
        <View style={styles.block}>
          <View style={styles.intro}>
            <Text style={styles.introTitle}>{t('onboarding.servicesTitle')}</Text>
            <Text style={styles.introBody}>{t('onboarding.servicesIntro')}</Text>
          </View>
          <Text style={styles.presetsLabel}>{t('onboarding.serviceExamples')}</Text>
          <View style={styles.chipRow}>
            {serviceExamples.map((example, index) => (
              <Chip
                key={example.name}
                label={index === 0 ? t('onboarding.serviceExampleHaircut') : t('onboarding.serviceExampleBeard')}
                selected={false}
                onPress={() => onboarding.setDraft({
                  ...draft,
                  services: applyServiceExample(draft.services, example),
                })}
              />
            ))}
          </View>
          {draft.services.map((service, index) => (
            <OnboardingServiceCard
              key={`service-${index}`}
              service={service}
              canRemove={draft.services.length > 1}
              onChange={(next) => onboarding.setDraft({
                ...draft,
                services: draft.services.map((item, i) => (i === index ? next : item)),
              })}
              onRemove={() => onboarding.setDraft({
                ...draft,
                services: draft.services.filter((_, i) => i !== index),
              })}
            />
          ))}
          <Button
            label={t('onboarding.addService')}
            variant="secondary"
            onPress={() =>
              onboarding.setDraft({
                ...draft,
                services: [...draft.services, { name: '', priceDzd: '', durationMinutes: '30' }],
              })
            }
          />
        </View>
      ) : null}

      {step === 3 ? (
        <View style={styles.block}>
          <View style={styles.intro}>
            <Text style={styles.introTitle}>{t('onboarding.hoursTitle')}</Text>
            <Text style={styles.introBody}>{t('onboarding.hoursIntro')}</Text>
          </View>
          <Text style={styles.presetsLabel}>{t('onboarding.schedulePresets')}</Text>
          <View style={styles.chipRow}>
            {schedulePresets.map((preset) => (
              <Chip
                key={preset.kind}
                label={t(preset.labelKey)}
                selected={false}
                onPress={() => onboarding.setDraft({
                  ...draft,
                  schedules: applySchedulePreset(preset.kind),
                })}
              />
            ))}
          </View>
          <WeeklyScheduleEditor
            schedules={draft.schedules}
            onChange={(schedules) => onboarding.setDraft({ ...draft, schedules })}
          />
          <View style={styles.intervalBlock}>
            <Text style={styles.intervalLabel}>{t('onboarding.interval')}</Text>
            <AppointmentIntervalPicker
              value={draft.intervalMinutes}
              onChange={(intervalMinutes) => onboarding.setDraft({ ...draft, intervalMinutes })}
            />
          </View>
        </View>
      ) : null}

      {step === 4 ? (
        <View style={styles.block}>
          <OnboardingReview
            draft={draft}
            onEdit={(nextStep) => {
              setError(null);
              setStep(nextStep);
            }}
          />
          <Text style={styles.publishHint}>
            {draft.workplaceType === 'owner'
              ? t('onboarding.publishOwnerHint')
              : t('onboarding.publishWorkerHint')}
          </Text>
          <Button label={t('barber.publish')} onPress={() => void publish()} loading={busy || onboarding.saving} />
        </View>
      ) : null}

      <View style={styles.nav}>
        {step > 0 ? (
          <Button label={t('common.back')} variant="secondary" disabled={exiting} onPress={goBack} />
        ) : null}
        {step < 4 ? (
          <Button
            label={t('common.next')}
            onPress={() => void persist((step + 1) as BarberOnboardingStep)}
            loading={onboarding.saving}
            disabled={exiting}
          />
        ) : null}
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
