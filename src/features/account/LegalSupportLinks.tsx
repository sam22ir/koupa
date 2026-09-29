import { Linking, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';

import {
  ACCOUNT_DELETION_URL,
  PRIVACY_URL,
  SUPPORT_EMAIL_URL,
  TERMS_URL,
} from '@/src/config/legal';
import { t } from '@/src/i18n';
import type { LegalDocument } from '@/src/services/legal';
import { colors, space, typography } from '@/src/theme';

import { SettingsGroup, SettingsRow } from './SettingsList';

function openExternalUrl(url: string): void {
  void Linking.openURL(url).catch(() => undefined);
}

/** Help, privacy and legal rows shared by both account screens. */
export function LegalSupportLinks({
  documents,
  title,
}: {
  readonly documents: readonly LegalDocument[];
  readonly title?: string;
}) {
  const terms = documents.find((document) => document.key === 'terms');
  const privacy = documents.find((document) => document.key === 'privacy');
  const legalUnavailable = !terms || !privacy;

  return (
    <>
      <SettingsGroup title={title}>
        <SettingsRow
          icon="chatbubble-ellipses-outline"
          label={t('profile.supportEmail')}
          external
          onPress={() => openExternalUrl(SUPPORT_EMAIL_URL)}
        />
        <SettingsRow
          icon="ban-outline"
          label={t('moderation.blockedUsers')}
          onPress={() => router.push('/blocked-users')}
        />
        <SettingsRow
          icon="document-text-outline"
          label={t('auth.openTerms')}
          external
          onPress={() => openExternalUrl(TERMS_URL)}
        />
        <SettingsRow
          icon="shield-checkmark-outline"
          label={t('profile.privacyPolicy')}
          external
          onPress={() => openExternalUrl(PRIVACY_URL)}
        />
        <SettingsRow
          icon="information-circle-outline"
          label={t('profile.accountDeletionInfo')}
          external
          onPress={() => openExternalUrl(ACCOUNT_DELETION_URL)}
        />
      </SettingsGroup>
      {legalUnavailable ? <Text style={styles.warning}>{t('profile.legalUnavailable')}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  warning: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'right',
    paddingHorizontal: space[1],
  },
});
