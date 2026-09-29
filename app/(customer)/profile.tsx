import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, ErrorBanner, Field, Screen } from '@/src/components/ui';
import { AccountFooter, DangerZone } from '@/src/features/account/AccountSections';
import { AccountHeader } from '@/src/features/account/AccountHeader';
import { LegalSupportLinks } from '@/src/features/account/LegalSupportLinks';
import { SettingsGroup, SettingsRow } from '@/src/features/account/SettingsList';
import { useAccountLifecycle } from '@/src/hooks/useAccountLifecycle';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import * as profileService from '@/src/services/profile';
import { colors, layout, radii, space, typography } from '@/src/theme';

export default function CustomerProfileScreen() {
  const { profile, session, refreshProfile, signOut, legalDocuments } = useAppSession();
  const account = useAccountLifecycle();
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [editError, setEditError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  const name = profile?.name ?? t('profile.accountNameFallback');
  const email = session?.user.email ?? '';
  const phone = profile?.phone ?? '';

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
    setEditError(null);
    setSuccess(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    if (saving) return;
    setEditError(null);
    setEditing(false);
  };

  const saveName = async () => {
    const nextName = draftName.trim();
    if (!nextName) {
      setEditError(new Error(t('profile.nameRequired')));
      return;
    }
    if (!session?.user.id) {
      setEditError(new Error(t('errors.UNAUTHORIZED')));
      return;
    }

    setSaving(true);
    setEditError(null);
    try {
      await profileService.updateProfileName(session.user.id, nextName);
      await refreshProfile();
      setEditing(false);
      setSuccess(t('profile.saved'));
    } catch (caught) {
      setEditError(caught);
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
    <Screen padded={false} scroll bleedTop>
      <AccountHeader
        title={t('profile.title')}
        name={name}
        lines={[email, phone].filter(Boolean)}
        role={t('auth.roleCustomer')}
      />
      <View style={styles.body}>
        <ErrorBanner error={error || account.error} />
        {success ? (
          <Text accessibilityRole="alert" style={styles.success}>{success}</Text>
        ) : null}

        <SettingsGroup title={t('profile.accountSection')}>
          <SettingsRow icon="person-outline" label={t('profile.edit')} onPress={openEditor} />
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

      <Modal visible={editing} transparent animationType="slide" onRequestClose={cancelEdit}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetRoot}
        >
          <Pressable accessibilityLabel={t('common.cancel')} style={styles.backdrop} onPress={cancelEdit} />
          <View style={styles.sheet} accessibilityViewIsModal>
            <View style={styles.handle} />
            <Text accessibilityRole="header" style={styles.sheetTitle}>{t('profile.edit')}</Text>
            <Field label={t('auth.name')} value={draftName} onChangeText={setDraftName} autoFocus />
            <Field
              label={t('profile.contactPhone')}
              value={profile?.phone ?? t('profile.accountPhoneFallback')}
              editable={false}
              style={styles.readOnlyInput}
            />
            <ErrorBanner error={editError} />
            <View style={styles.sheetActions}>
              <Button
                label={t('profile.saveChanges')}
                onPress={() => void saveName()}
                loading={saving}
                style={styles.sheetAction}
              />
              <Button
                label={t('common.cancel')}
                variant="outline"
                disabled={saving}
                onPress={cancelEdit}
                style={styles.sheetAction}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingTop: space[5],
    paddingHorizontal: layout.screenPaddingX,
    gap: space[5],
  },
  success: {
    ...typography.label,
    color: colors.success,
    textAlign: 'right',
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radii.md,
    backgroundColor: colors.successSoft,
    overflow: 'hidden',
  },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.scrim },
  sheet: {
    gap: space[4],
    padding: layout.screenPaddingX,
    paddingBottom: space[8],
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    backgroundColor: colors.surface,
  },
  handle: {
    width: 40,
    height: 4,
    alignSelf: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.border,
  },
  sheetTitle: { ...typography.titleSm, textAlign: 'right' },
  readOnlyInput: { color: colors.textMuted },
  sheetActions: { flexDirection: 'row-reverse', gap: space[3] },
  sheetAction: { flex: 1 },
});
