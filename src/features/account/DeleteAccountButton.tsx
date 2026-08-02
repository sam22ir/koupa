import { useState } from 'react';
import { Linking, Modal, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui';
import { ACCOUNT_DELETION_URL } from '@/src/config/legal';
import { t } from '@/src/i18n';
import { colors, radii, space, typography } from '@/src/theme';

export function DeleteAccountButton({
  onConfirm,
  disabled = false,
}: {
  readonly onConfirm: () => Promise<boolean>;
  readonly disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  const confirm = async () => {
    setDeleting(true);
    setFailed(false);
    try {
      const deleted = await onConfirm();
      if (deleted) setVisible(false);
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button
        label={t('common.deleteAccount')}
        variant="danger"
        disabled={disabled}
        onPress={() => {
          setFailed(false);
          setVisible(true);
        }}
      />
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) setVisible(false);
        }}
      >
        <View style={styles.backdrop}>
          <View style={styles.dialog} accessibilityViewIsModal>
            <Text style={styles.title}>{t('common.deleteAccount')}</Text>
            <Text style={styles.body}>{t('profile.deleteConfirm')}</Text>
            <Button
              label={t('profile.accountDeletionInfo')}
              variant="ghost"
              disabled={deleting}
              onPress={() => void Linking.openURL(ACCOUNT_DELETION_URL).catch(() => undefined)}
            />
            {failed ? <Text style={styles.error}>{t('errors.FAILED')}</Text> : null}
            <View style={styles.actions}>
              <Button
                label={t('common.no')}
                variant="secondary"
                disabled={deleting}
                onPress={() => setVisible(false)}
                style={styles.action}
              />
              <Button
                label={t('common.yes')}
                variant="danger"
                loading={deleting}
                onPress={() => void confirm()}
                style={styles.action}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(20,30,38,0.48)',
    padding: space[5],
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: space[4],
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: space[5],
  },
  title: {
    ...typography.titleSm,
    color: colors.danger,
    textAlign: 'right',
  },
  body: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'right',
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: space[3],
  },
  action: {
    flex: 1,
  },
});
