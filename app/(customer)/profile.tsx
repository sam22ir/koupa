import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import {
  Avatar,
  Button,
  Card,
  CustomerStageHeader,
  ErrorBanner,
  Field,
  Icon,
  Screen,
  type IconName,
} from '@/src/components/ui';
import { DeleteAccountButton } from '@/src/features/account/DeleteAccountButton';
import { LegalSupportLinks } from '@/src/features/account/LegalSupportLinks';
import { useAccountLifecycle } from '@/src/hooks/useAccountLifecycle';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import * as profileService from '@/src/services/profile';
import { colors, radii, space, typography } from '@/src/theme';
import { initialsFromName } from '@/src/utils/initials';

export default function CustomerProfileScreen() {
  const { profile, session, refreshProfile, signOut, legalDocuments } = useAppSession();
  const account = useAccountLifecycle();
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [saving, setSaving] = useState(false);

  const logout = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (caught) {
      setError(caught);
    }
  };

  const openEditor = () => {
    setDraftName(profile?.name ?? '');
    setError(null);
    setSuccess(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraftName(profile?.name ?? '');
    setError(null);
    setEditing(false);
  };

  const saveName = async () => {
    const name = draftName.trim();
    if (!name) {
      setError(new Error(t('profile.nameRequired')));
      return;
    }
    if (!session?.user.id) {
      setError(new Error(t('errors.UNAUTHORIZED')));
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await profileService.updateProfileName(session.user.id, name);
      await refreshProfile();
      setEditing(false);
      setSuccess(t('profile.saved'));
    } catch (caught) {
      setError(caught);
    } finally {
      setSaving(false);
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
    <Screen padded={false} scroll>
      <CustomerStageHeader title={t('profile.title')} tone="paper" />
      <View style={styles.body}>
        <Card elevated style={styles.identityCard}>
          {editing ? (
            <View style={styles.editor}>
              <View style={styles.editorHeading}>
                <Avatar initials={initialsFromName(profile?.name ?? '؟')} size={56} />
                <View style={styles.copy}>
                  <Text style={styles.editorTitle}>{t('profile.edit')}</Text>
                  <Text style={styles.meta}>{t('profile.loginPhone')}</Text>
                </View>
              </View>
              <Field label={t('auth.name')} value={draftName} onChangeText={setDraftName} autoFocus />
              <Field
                label={t('profile.loginPhone')}
                value={profile?.phone ?? t('profile.accountPhoneFallback')}
                editable={false}
                style={styles.readOnlyInput}
              />
              <View style={styles.editorActions}>
                <Button
                  label={t('profile.saveChanges')}
                  onPress={() => void saveName()}
                  loading={saving}
                  style={styles.editorAction}
                />
                <Button
                  label={t('common.cancel')}
                  variant="secondary"
                  disabled={saving}
                  onPress={cancelEdit}
                  style={styles.editorAction}
                />
              </View>
            </View>
          ) : (
            <View style={styles.header}>
              <Avatar initials={initialsFromName(profile?.name ?? '؟')} size={56} />
              <View style={styles.copy}>
                <Text style={styles.name}>{profile?.name ?? t('profile.accountNameFallback')}</Text>
                <Text style={styles.metaLabel}>{t('profile.loginPhone')}</Text>
                <Text style={styles.meta}>{profile?.phone ?? t('profile.accountPhoneFallback')}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="تعديل بطاقة الهوية"
                onPress={openEditor}
                style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
              >
                <Icon name="create-outline" size={21} color={colors.primary} />
              </Pressable>
            </View>
          )}
        </Card>
        <ErrorBanner error={error || account.error} />
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.accountSection')}</Text>
          <View style={styles.actionSurface}>
            <ActionRow icon="create-outline" label={t('profile.edit')} onPress={openEditor} />
            <ActionRow icon="notifications-outline" label={t('profile.notifications')} onPress={() => router.push('/notifications')} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.helpPrivacySection')}</Text>
          <Card style={styles.resourceCard}>
            <LegalSupportLinks documents={legalDocuments} />
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.sessionSection')}</Text>
          <View style={styles.actionSurface}>
            <ActionRow icon="log-out-outline" label={t('common.logout')} onPress={() => void logout()} />
          </View>
        </View>

        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>{t('profile.dangerSection')}</Text>
          <Text style={styles.dangerBody}>{t('profile.dangerBody')}</Text>
          <DeleteAccountButton onConfirm={deleteAccount} disabled={account.loading} />
        </View>
      </View>
    </Screen>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
  style,
}: {
  readonly icon: IconName;
  readonly label: string;
  readonly onPress: () => void;
  readonly style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, style, pressed && styles.actionRowPressed]}
    >
      <Icon name="chevron-back" size={19} color={colors.textMuted} />
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{label}</Text>
      </View>
      <View style={styles.actionIcon}>
        <Icon name={icon} size={20} color={colors.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: space[5],
    gap: space[3],
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
    textAlign: 'right',
  },
  metaLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'right',
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'right',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  iconButtonPressed: {
    backgroundColor: colors.accentSoft,
  },
  editor: {
    gap: space[4],
  },
  editorHeading: {
    flexDirection: 'row-reverse',
    gap: space[3],
    alignItems: 'center',
  },
  editorTitle: {
    ...typography.bodyStrong,
    textAlign: 'right',
  },
  readOnlyInput: {
    color: colors.textMuted,
  },
  editorActions: {
    flexDirection: 'row-reverse',
    gap: space[3],
  },
  editorAction: {
    flex: 1,
  },
  success: {
    ...typography.caption,
    color: colors.success,
    textAlign: 'right',
    fontWeight: '600',
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
