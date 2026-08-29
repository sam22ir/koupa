import { router } from 'expo-router';
import { useState } from 'react';

import { getSignupPhone, normalizeAlgerianPhone } from '@/src/auth';
import { AuthShell, Button, ErrorBanner, Field } from '@/src/components/ui';
import { t } from '@/src/i18n';
import { setCustomerFindCityPreference } from '@/src/navigation/customerFindPreference';
import { useAppSession } from '@/src/providers/SessionProvider';
import * as onboardingService from '@/src/services/onboarding';

export default function CustomerSetupScreen() {
  const { session, refreshProfile, signOut } = useAppSession();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(
    getSignupPhone(session?.user ?? null) ?? session?.user.phone ?? '',
  );
  const [city, setCity] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    const normalized = normalizeAlgerianPhone(phone);
    if (!name.trim() || !normalized) {
      setError(new Error(t('errors.VALIDATION')));
      return;
    }
    setBusy(true);
    try {
      if (!session?.user.id) throw new Error('No active session');
      const trimmedCity = city.trim();
      await onboardingService.createCustomerProfile(
        session.user.id,
        name.trim(),
        normalized,
        trimmedCity || undefined,
      );
      await setCustomerFindCityPreference(trimmedCity);
      await refreshProfile();
      router.replace('/');
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={t('auth.pendingProfile')}
      subtitle={t('auth.customerSetupSubtitle')}
      progress={t('auth.journeyCustomerSetup')}
      showBack={false}
    >
      <Field label={t('auth.name')} value={name} onChangeText={setName} />
      <Field
        label={t('auth.phone')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        hint={t('auth.phonePurpose')}
      />
      <Field
        label={t('auth.cityOptional')}
        value={city}
        onChangeText={setCity}
        hint={t('auth.cityOptionalHint')}
      />
      <ErrorBanner error={error} />
      <Button label={t('auth.customerSetupCta')} onPress={() => void submit()} loading={busy} />
      <Button
        label={t('auth.changeAccount')}
        variant="secondary"
        disabled={busy}
        onPress={() => {
          void signOut()
            .then(() => router.replace('/(auth)/welcome'))
            .catch((caught) => setError(caught));
        }}
      />
    </AuthShell>
  );
}
