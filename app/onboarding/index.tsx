import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getSignupPhone } from '@/src/auth';
import { Button, ErrorBanner, Field, Screen, Stage } from '@/src/components/ui';
import { OnboardingLocationStep } from '@/src/components/onboarding/OnboardingLocationStep';
import { OnboardingReview } from '@/src/components/onboarding/OnboardingReview';
import { OnboardingServiceCard } from '@/src/components/onboarding/OnboardingServiceCard';
import { WorkplaceChoice } from '@/src/components/onboarding/WorkplaceChoice';
import { AppointmentIntervalPicker } from '@/src/features/barber-schedule/AppointmentIntervalPicker';
import { WeeklyScheduleEditor } from '@/src/features/barber-schedule/WeeklyScheduleEditor';
import { useOnboarding } from '@/src/hooks/useOnboarding';
import { t } from '@/src/i18n';
import {
  firstInvalidBarberOnboardingStep,
  validateBarberOnboardingStep,
  type BarberOnboardingError,
  type BarberOnboardingStep,
} from '@/src/onboardingValidation';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, space, typography } from '@/src/theme';

const steps = [
  t('barber.stepBasic'),
  t('barber.stepLocation'),
  t('barber.stepServices'),
  t('barber.stepHours'),
  t('barber.stepReview'),
] as const;

const validationCopy: Record<BarberOnboardingError, string> = {
  basic: 'أدخل اسما ورقم هاتف جزائريا صالحا.',
  location: 'أدخل المدينة والحي ورابط Google Maps صالحا.',
  services: 'أضف خدمة صالحة بسعر موجب ومدة من مضاعفات 5 دقائق.',
  schedule: 'حدد يوم عمل واحدا على الأقل وتحقق من الساعات والاستراحات.',
};

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
  const draft = onboarding.draft;

  const title = useMemo(() => steps[step] ?? t('barber.onboarding'), [step]);

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
      await refreshProfile();
      router.replace('/');
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll loading={onboarding.hydrating && !onboarding.loadError}>
      <Stage decoration="subtle">
        <View style={styles.stageHeader}>
          <Text style={styles.stageKicker}>{t('barber.onboarding')} · {step + 1}/5</Text>
          <Text style={styles.stageTitle}>{title}</Text>
          <Text style={styles.stageBody}>{t('barber.onboardingBody')}</Text>
        </View>
      </Stage>
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
            <Text style={styles.introTitle}>ابدأ ملفك</Text>
            <Text style={styles.introBody}>معلومات بسيطة ليعرفك الزبائن ويجدوا وقتا مناسبا للحجز.</Text>
          </View>
          <Field label={t('auth.name')} value={draft.name} onChangeText={(name) => onboarding.setDraft({ ...draft, name })} />
          <Field label={t('auth.phone')} value={draft.phone} onChangeText={(phone) => onboarding.setDraft({ ...draft, phone })} />
          <Field label="نبذة قصيرة" value={draft.bio} onChangeText={(bio) => onboarding.setDraft({ ...draft, bio })} multiline />
          <WorkplaceChoice
            value={draft.workplaceType}
            onChange={(workplaceType) => onboarding.setDraft({
              ...draft,
              workplaceType,
              ...(workplaceType === 'worker' ? { city: '', neighborhood: '', mapsUrl: '', latitude: '', longitude: '' } : {}),
            })}
          />
        </View>
      ) : null}

      {step === 1 ? (
        <OnboardingLocationStep draft={draft} onChange={(next) => onboarding.setDraft({ ...draft, ...next })} />
      ) : null}

      {step === 2 ? (
        <View style={styles.block}>
          <View style={styles.intro}>
            <Text style={styles.introTitle}>خدماتك</Text>
            <Text style={styles.introBody}>أضف الخدمات التي تقدمها للزبائن.</Text>
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
            label="+ إضافة خدمة"
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
            <Text style={styles.introTitle}>ساعات عملك</Text>
            <Text style={styles.introBody}>اختر الأيام والأوقات التي تستقبل فيها الحجوزات.</Text>
          </View>
          <WeeklyScheduleEditor
            schedules={draft.schedules}
            onChange={(schedules) => onboarding.setDraft({ ...draft, schedules })}
          />
          <View style={styles.intervalBlock}>
            <Text style={styles.intervalLabel}>فاصل المواعيد</Text>
            <AppointmentIntervalPicker
              value={draft.intervalMinutes}
              onChange={(intervalMinutes) => onboarding.setDraft({ ...draft, intervalMinutes })}
            />
          </View>
        </View>
      ) : null}

      {step === 4 ? (
        <View style={styles.block}>
          <OnboardingReview draft={draft} onEdit={(nextStep) => void persist(nextStep)} />
          <Button label={t('barber.publish')} onPress={() => void publish()} loading={busy || onboarding.saving} />
        </View>
      ) : null}

      <View style={styles.nav}>
        {step > 0 ? (
          <Button label={t('common.back')} variant="secondary" onPress={() => void persist((step - 1) as BarberOnboardingStep)} />
        ) : (
          <Button
            label={t('common.logout')}
            variant="ghost"
            onPress={() => {
              void signOut().then(() => router.replace('/'));
            }}
          />
        )}
        {step < 4 ? (
          <Button label={t('common.next')} onPress={() => void persist((step + 1) as BarberOnboardingStep)} loading={onboarding.saving} />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stageHeader: { gap: space[1], alignItems: 'flex-end' },
  stageKicker: { ...typography.caption, color: colors.onPrimaryMuted, textAlign: 'right' },
  stageTitle: { ...typography.title, color: colors.onPrimary, textAlign: 'right' },
  stageBody: { ...typography.caption, color: colors.onPrimaryMuted, textAlign: 'right' },
  block: {
    gap: space[3],
  },
  intro: { gap: space[1], alignItems: 'flex-end' },
  introTitle: { ...typography.titleSm, textAlign: 'right' },
  introBody: { ...typography.caption, textAlign: 'right' },
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
});
