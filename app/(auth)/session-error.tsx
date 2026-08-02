import { router } from 'expo-router';
import { useState } from 'react';

import { AuthShell, Button, ErrorBanner } from '@/src/components/ui';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';

export default function SessionErrorScreen() {
  const { bootstrapError, retrySession, signOut } = useAppSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const retry = async () => {
    setBusy(true);
    setError(null);
    try {
      await retrySession();
      router.replace('/');
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  const changeAccount = async () => {
    setBusy(true);
    setError(null);
    try {
      await signOut();
      router.replace('/(auth)/welcome');
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="تعذر تحميل الجلسة" subtitle="تحقق من الاتصال ثم حاول مرة أخرى.">
      <ErrorBanner error={error || bootstrapError} />
      <Button label={t('common.retry')} loading={busy} onPress={() => void retry()} />
      <Button
        label={t('auth.changeAccount')}
        variant="secondary"
        disabled={busy}
        onPress={() => void changeAccount()}
      />
    </AuthShell>
  );
}
