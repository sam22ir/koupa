import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ErrorBanner, Screen } from '@/src/components/ui';
import { AccountFooter, DangerZone } from '@/src/features/account/AccountSections';
import { AccountHeader } from '@/src/features/account/AccountHeader';
import { LegalSupportLinks } from '@/src/features/account/LegalSupportLinks';
import { SettingsGroup, SettingsRow } from '@/src/features/account/SettingsList';
import { useAccountLifecycle } from '@/src/hooks/useAccountLifecycle';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, layout, radii, space, typography } from '@/src/theme';

export default function BarberProfileScreen() {
  const { profile, session, signOut, legalDocuments } = useAppSession();
  const account = useAccountLifecycle();
  const [error, setError] = useState<unknown>(null);

  const name = profile?.name ?? t('profile.accountNameFallback');
  const email = session?.user.email ?? '';
  const phone = profile?.phone ?? '';
  const published = Boolean(profile?.is_published);

  const logout = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (caught) {
      setError(caught);
    }
  };

  const deleteAccount = async () => {
    try {
      const deleted = await account.deleteAccount();
      if (!deleted) return false;
      await signOut();
      router.replace('/');
      return true;
    } catch (caught) {
      setError(caught);
      return false;
    }
  };

  return (
    <Screen padded={false} scroll bleedTop>
      <AccountHeader
        title={t('profile.title')}
        name={name}
        lines={[email, phone].filter(Boolean)}
        role={t('auth.roleBarber')}
        status={profile ? <PublishPill published={published} /> : null}
      />
      <View style={styles.body}>
        <ErrorBanner error={error || account.error} />

        <SettingsGroup title={t('profile.accountSection')}>
          {profile?.id && published ? (
            <SettingsRow
              icon="storefront-outline"
              label={t('profile.viewPublicProfile')}
              onPress={() => router.push({
                pathname: '/barber/[id]',
                params: { id: profile.id, returnTo: '/(barber)/profile' },
              })}
            />
          ) : null}
          <SettingsRow
            icon="notifications-outline"
            label={t('profile.notifications')}
            onPress={() => router.push('/notifications')}
          />
        </SettingsGroup>

        <LegalSupportLinks documents={legalDocuments} title={t('profile.helpPrivacySection')} />

        <SettingsGroup title={t('profile.sessionSection')}>
          <SettingsRow icon="log-out-outline" label={t('common.logout')} onPress={() => void logout()} />
        </SettingsGroup>

        <DangerZone onDelete={deleteAccount} disabled={account.loading} />
        <AccountFooter />
      </View>
    </Screen>
  );
}

/** Whether customers can find this barber, stated in words, not color alone. */
function PublishPill({ published }: { readonly published: boolean }) {
  return (
    <View style={[styles.pill, published ? styles.pillOn : styles.pillOff]}>
      <View style={[styles.dot, { backgroundColor: published ? colors.onPrimary : colors.accent }]} />
      <Text style={styles.pillText}>{published ? t('profile.published') : t('profile.unpublished')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingTop: space[5],
    paddingHorizontal: layout.screenPaddingX,
    gap: space[5],
  },
  pill: {
    minHeight: 26,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[1] + 2,
    paddingHorizontal: space[3],
    borderRadius: radii.pill,
  },
  pillOn: { backgroundColor: colors.stageOverlay },
  pillOff: { backgroundColor: colors.stageAccent },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { ...typography.label, fontSize: 12, lineHeight: 18, color: colors.onPrimary },
});
