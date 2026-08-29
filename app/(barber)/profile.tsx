import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Card, Chip, CustomerStageHeader, ErrorBanner, Icon, Screen } from '@/src/components/ui';
import { DeleteAccountButton } from '@/src/features/account/DeleteAccountButton';
import { LegalSupportLinks } from '@/src/features/account/LegalSupportLinks';
import { useAccountLifecycle } from '@/src/hooks/useAccountLifecycle';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, layout, radii, space, typography } from '@/src/theme';
import { initialsFromName } from '@/src/utils/initials';

export default function BarberProfileScreen() {
  const { profile, signOut, legalDocuments } = useAppSession();
  const account = useAccountLifecycle();
  const [error, setError] = useState<unknown>(null);

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
    <Screen padded={false} scroll style={styles.screen} contentStyle={styles.content}>
      <CustomerStageHeader
        tone="paper"
        title={t('profile.title')}
        subtitle={t('profile.subtitle')}
      />

      <View style={styles.body}>
        <Card elevated style={styles.identityCard}>
          <View style={styles.header}>
            <Avatar initials={initialsFromName(profile?.name ?? '؟')} size={64} />
            <View style={styles.copy}>
              <Text style={styles.name}>{profile?.name ?? t('profile.accountNameFallback')}</Text>
              <Text style={styles.meta}>{profile?.phone ?? t('profile.accountPhoneFallback')}</Text>
            </View>
          </View>
          <View style={styles.identityFooter}>
            <Chip label={t('auth.roleBarber')} tone="primary" />
            <Text style={styles.identityNote}>{t('profile.identityNote')}</Text>
          </View>
        </Card>

        <ErrorBanner error={error || account.error} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.accountSection')}</Text>
          <View style={styles.actionSurface}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('profile.notifications')}
              onPress={() => router.push('/notifications')}
              style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
            >
              <Icon name="chevron-back" size={19} color={colors.textMuted} />
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>{t('profile.notifications')}</Text>
              </View>
              <View style={styles.actionIcon}>
                <Icon name="notifications-outline" size={20} color={colors.primary} />
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.resourcesSection')}</Text>
          <Card style={styles.resourceCard}>
            <LegalSupportLinks documents={legalDocuments} />
          </Card>
        </View>

        <Card style={styles.sessionCard}>
          <Button label={t('common.logout')} variant="secondary" onPress={() => void logout()} />
        </Card>

        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>{t('profile.dangerSection')}</Text>
          <Text style={styles.dangerBody}>{t('profile.dangerBody')}</Text>
          <DeleteAccountButton onConfirm={deleteAccount} disabled={account.loading} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.workspace,
  },
  content: {
    flexGrow: 1,
    gap: 0,
    paddingTop: 0,
    paddingBottom: space[10],
  },
  body: {
    flex: 1,
    gap: space[4],
    paddingHorizontal: layout.screenPaddingX,
    backgroundColor: colors.workspace,
  },
  identityCard: {
    gap: space[4],
    borderRadius: radii['2xl'],
  },
  header: {
    flexDirection: 'row-reverse',
    gap: space[3],
    alignItems: 'center',
  },
  copy: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  name: {
    ...typography.titleSm,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  identityFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space[3],
  },
  identityNote: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
    textAlign: 'right',
  },
  section: {
    gap: space[2],
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    textAlign: 'right',
  },
  actionSurface: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
  },
  actionRow: {
    minHeight: 64,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
  },
  actionRowPressed: {
    backgroundColor: colors.primarySoft,
  },
  actionCopy: {
    flex: 1,
    alignItems: 'flex-end',
  },
  actionTitle: {
    ...typography.bodyStrong,
    textAlign: 'right',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  resourceCard: {
    paddingVertical: space[3],
  },
  sessionCard: {
    padding: space[3],
  },
  dangerSection: {
    gap: space[2],
    paddingTop: space[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dangerTitle: {
    ...typography.label,
    color: colors.danger,
    textAlign: 'right',
  },
  dangerBody: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 21,
    textAlign: 'right',
  },
});
