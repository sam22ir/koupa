import { Linking, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/src/components/ui';
import {
  ACCOUNT_DELETION_URL,
  PRIVACY_URL,
  SUPPORT_EMAIL_URL,
  TERMS_URL,
} from '@/src/config/legal';
import { t } from '@/src/i18n';
import type { LegalDocument } from '@/src/services/legal';
import { colors, space, typography } from '@/src/theme';

function openExternalUrl(url: string): void {
  void Linking.openURL(url).catch(() => undefined);
}

export function LegalSupportLinks({ documents }: { readonly documents: readonly LegalDocument[] }) {
  const terms = documents.find((document) => document.key === 'terms');
  const privacy = documents.find((document) => document.key === 'privacy');
  const legalUnavailable = !terms || !privacy;

  return (
    <View style={styles.group}>
      {legalUnavailable ? <Text style={styles.warning}>{t('profile.legalUnavailable')}</Text> : null}
      <Button
        label={t('moderation.blockedUsers')}
        variant="ghost"
        onPress={() => router.push('/blocked-users')}
      />
      <Button
        label={t('auth.openTerms')}
        variant="ghost"
        onPress={() => openExternalUrl(TERMS_URL)}
      />
      <Button
        label={t('profile.privacyPolicy')}
        variant="ghost"
        onPress={() => openExternalUrl(PRIVACY_URL)}
      />
      <Button
        label={t('profile.accountDeletionInfo')}
        variant="ghost"
        onPress={() => openExternalUrl(ACCOUNT_DELETION_URL)}
      />
      <Button
        label={t('profile.supportEmail')}
        variant="secondary"
        onPress={() => openExternalUrl(SUPPORT_EMAIL_URL)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: space[1],
  },
  warning: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'right',
  },
});
