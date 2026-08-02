import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, ErrorBanner, Field, Screen, ScreenTitle } from '@/src/components/ui';
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
  location: 'أدخل رابط Google Maps صالحا أو إحداثيات صحيحة.',
  services: 'أضف خدمة صالحة بسعر موجب ومدة من مضاعفات 5 دقائق.',
  schedule: 'حدد يوم عمل واحدا على الأقل وتحقق من الساعات والاستراحات.',
};

export default function BarberOnboardingScreen() {
  const { session, refreshProfile, signOut } = useAppSession();
  const onboarding = useOnboarding({
    userId: session?.user.id,
    initialPhone: session?.user.phone,
  });
  const [step, setStep] = useState<BarberOnboardingStep>(
    (onboarding.draftStep || 0) as BarberOnboardingStep,
  );
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const draft = onboarding.draft;

  const title = useMemo(() => steps[step] ?? t('barber.onboarding'), [step]);

  useEffect(() => {
    if (onboarding.hydrating) return;
    const timeout = setTimeout(
      () => setStep(onboarding.draftStep as BarberOnboardingStep),
      0,
    );
    return () => clearTimeout(timeout);
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
      <ScreenTitle title={t('barber.onboarding')} subtitle={`${step + 1}/5 · ${title}`} />
      <ErrorBanner error={error || onboarding.saveError || onboarding.loadError} />
      {onboarding.loadError ? (
        <Button label={t('common.retry')} variant="secondary" onPress={() => void onboarding.retryLoad()} />
      ) : null}
      {onboarding.saveError ? (
        <Button label={t('common.retry')} variant="secondary" onPress={() => void onboarding.retrySave()} />
      ) : null}

      {step === 0 ? (
        <View style={styles.block}>
          <Field label={t('auth.name')} value={draft.name} onChangeText={(name) => onboarding.setDraft({ ...draft, name })} />
          <Field label={t('auth.phone')} value={draft.phone} onChangeText={(phone) => onboarding.setDraft({ ...draft, phone })} />
          <Field label="نبذة" value={draft.bio} onChangeText={(bio) => onboarding.setDraft({ ...draft, bio })} />
        </View>
      ) : null}

      {step === 1 ? (
        <View style={styles.block}>
          <Field label="المدينة" value={draft.city} onChangeText={(city) => onboarding.setDraft({ ...draft, city })} />
          <Field label="الحي" value={draft.neighborhood} onChangeText={(neighborhood) => onboarding.setDraft({ ...draft, neighborhood })} />
          <Field label="رابط Google Maps" value={draft.mapsUrl} onChangeText={(mapsUrl) => onboarding.setDraft({ ...draft, mapsUrl })} />
          <Field label="خط العرض" value={draft.latitude} onChangeText={(latitude) => onboarding.setDraft({ ...draft, latitude })} />
          <Field label="خط الطول" value={draft.longitude} onChangeText={(longitude) => onboarding.setDraft({ ...draft, longitude })} />
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.block}>
          {draft.services.map((service, index) => (
            <View key={`service-${index}`} style={styles.service}>
              <Field
                label="الخدمة"
                value={service.name}
                onChangeText={(name) => {
                  const services = draft.services.map((item, i) => (i === index ? { ...item, name } : item));
                  onboarding.setDraft({ ...draft, services });
                }}
              />
              <Field
                label={`السعر (${t('common.dzd')})`}
                value={service.priceDzd}
                keyboardType="number-pad"
                onChangeText={(priceDzd) => {
                  const services = draft.services.map((item, i) => (i === index ? { ...item, priceDzd } : item));
                  onboarding.setDraft({ ...draft, services });
                }}
              />
              <Field
                label={t('common.minutes')}
                value={service.durationMinutes}
                keyboardType="number-pad"
                onChangeText={(durationMinutes) => {
                  const services = draft.services.map((item, i) => (i === index ? { ...item, durationMinutes } : item));
                  onboarding.setDraft({ ...draft, services });
                }}
              />
              {draft.services.length > 1 ? (
                <Button
                  label="حذف الخدمة"
                  variant="ghost"
                  onPress={() => onboarding.setDraft({
                    ...draft,
                    services: draft.services.filter((_, i) => i !== index),
                  })}
                />
              ) : null}
            </View>
          ))}
          <Button
            label="إضافة خدمة"
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
          <Text style={styles.review}>{draft.name}</Text>
          <Text style={styles.hint}>{draft.city} · {draft.neighborhood}</Text>
          <Text style={styles.hint}>{draft.services.filter((s) => s.name).length} خدمات</Text>
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
  block: {
    gap: space[3],
  },
  service: {
    gap: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space[3],
  },
  nav: {
    gap: space[3],
    marginTop: space[2],
  },
  review: {
    ...typography.titleSm,
    textAlign: 'right',
  },
  hint: {
    ...typography.caption,
    textAlign: 'right',
  },
  intervalBlock: {
    gap: space[2],
  },
  intervalLabel: {
    ...typography.bodyStrong,
    textAlign: 'right',
  },
});
