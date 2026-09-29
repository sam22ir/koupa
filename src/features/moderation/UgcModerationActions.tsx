import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/src/components/ui';
import { t } from '@/src/i18n';
import {
  blockUser,
  submitUGCReport,
  unblockUser,
  type UGCReportReason,
  type UGCReportTarget,
} from '@/src/services/ugcModeration';
import { colors, radii, space, typography } from '@/src/theme';

const reasons: readonly UGCReportReason[] = [
  'spam',
  'harassment',
  'misleading',
  'inappropriate',
  'privacy',
  'other',
];

type Props = {
  readonly targetKind: UGCReportTarget;
  readonly targetId: string;
  readonly targetName: string;
  readonly blockTargetId?: string;
  readonly blocked?: boolean;
  readonly additionalReportTarget?: {
    readonly kind: UGCReportTarget;
    readonly label: string;
  };
  readonly onBlockChange?: (blocked: boolean) => void;
};

export function UgcModerationActions({
  targetKind,
  targetId,
  targetName,
  blockTargetId,
  blocked = false,
  additionalReportTarget,
  onBlockChange,
}: Props) {
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<UGCReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<UGCReportTarget>(targetKind);

  const beginReport = (kind: UGCReportTarget) => {
    setSelectedReason(null);
    setDetails('');
    setMessage(null);
    setReportOpen(true);
    setTargetForReport(kind);
  };

  const submit = async () => {
    if (!selectedReason) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await submitUGCReport({
        targetKind: reportTarget,
        targetId,
        reason: selectedReason,
        details,
      });
      setReportOpen(false);
      setMessage(t('moderation.reportSent'));
    } catch (error) {
      setMessage(error instanceof Error && error.message.includes('duplicate key')
        ? t('moderation.reportAlreadySent')
        : t('moderation.reportFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmBlockChange = () => {
    if (!blockTargetId) return;
    const nextBlocked = !blocked;
    Alert.alert(
      nextBlocked ? t('moderation.blockConfirmTitle') : t('moderation.unblockConfirmTitle'),
      nextBlocked ? t('moderation.blockConfirmBody') : t('moderation.unblockConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: nextBlocked ? t('moderation.block') : t('moderation.unblock'),
          style: nextBlocked ? 'destructive' : 'default',
          onPress: () => {
            const request = nextBlocked ? blockUser(blockTargetId) : unblockUser(blockTargetId);
            void request
              .then(() => {
                onBlockChange?.(nextBlocked);
                setMessage(nextBlocked ? t('moderation.blocked') : t('moderation.unblocked'));
              })
              .catch(() => setMessage(t('moderation.blockFailed')));
          },
        },
      ],
    );
  };

  function setTargetForReport(kind: UGCReportTarget) {
    setReportTarget(kind);
  }

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <Button
          label={targetKind === 'shop' ? t('moderation.reportShop') : t('moderation.reportProfile')}
          variant="ghost"
          onPress={() => beginReport(targetKind)}
        />
        {additionalReportTarget ? (
          <Button
            label={additionalReportTarget.label}
            variant="ghost"
            onPress={() => beginReport(additionalReportTarget.kind)}
          />
        ) : null}
        {blockTargetId ? (
          <Button
            label={blocked ? t('moderation.unblock') : t('moderation.block')}
            variant="ghost"
            onPress={confirmBlockChange}
          />
        ) : null}
      </View>
      {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}

      <Modal
        visible={reportOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setReportOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.title}>{t('moderation.reportTitle')}</Text>
            <Text style={styles.description}>{`${t('moderation.reportDescription')} ${targetName}`}</Text>
            <View style={styles.reasonList}>
              {reasons.map((reason) => (
                <Pressable
                  key={reason}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedReason === reason }}
                  onPress={() => setSelectedReason(reason)}
                  style={[styles.reason, selectedReason === reason && styles.reasonSelected]}
                >
                  <Text style={[styles.reasonText, selectedReason === reason && styles.reasonTextSelected]}>
                    {t(`moderation.reasons.${reason}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={details}
              onChangeText={setDetails}
              maxLength={1000}
              multiline
              textAlign="right"
              placeholder={t('moderation.detailsOptional')}
              placeholderTextColor={colors.textMuted}
              style={styles.details}
              accessibilityLabel={t('moderation.detailsOptional')}
            />
            <Button
              label={t('moderation.sendReport')}
              onPress={() => void submit()}
              disabled={!selectedReason}
              loading={submitting}
            />
            <Button label={t('common.cancel')} variant="ghost" onPress={() => setReportOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: space[1] },
  actions: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'flex-start', gap: space[1] },
  message: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  backdrop: { flex: 1, justifyContent: 'center', padding: space[4], backgroundColor: colors.scrim },
  modalCard: { gap: space[3], borderRadius: radii.xl, backgroundColor: colors.surface, padding: space[5] },
  title: { ...typography.titleSm, color: colors.text, textAlign: 'right' },
  description: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  reasonList: { gap: space[2] },
  reason: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, paddingHorizontal: space[3] },
  reasonSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  reasonText: { ...typography.body, color: colors.text, textAlign: 'right' },
  reasonTextSelected: { color: colors.primary },
  details: { ...typography.body, minHeight: 78, maxHeight: 120, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: space[3], color: colors.text },
});
