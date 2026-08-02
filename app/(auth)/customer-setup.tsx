import { router } from 'expo-router';
import { useState } from 'react';

import { normalizeAlgerianPhone } from '@/src/auth';
import { Button, ErrorBanner, Field, Screen, ScreenTitle } from '@/src/components/ui';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import * as onboardingService from '@/src/services/onboarding';

export default function CustomerSetupScreen() {
  const { session, refreshProfile, signOut } = useAppSession();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(session?.user.phone ?? '');
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
      await onboardingService.createCustomerProfile(session.user.id, name.trim(), normalized);
      await refreshProfile();
      router.replace('/');
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenTitle title={t('auth.pendingProfile')} subtitle={t('auth.createProfile')} />
      <Field label={t('auth.name')} value={name} onChangeText={setName} />
      <Field label={t('auth.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <ErrorBanner error={error} />
      <Button label={t('auth.createProfile')} onPress={() => void submit()} loading={busy} />
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
    </Screen>
  );
}
