import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ManagedServiceDraft } from '@/src/barberSettings';
import { Button, Field, Icon } from '@/src/components/ui';
import { updateWorkspaceService, type WorkspaceValidationErrors } from '@/src/features/barber-schedule/model';
import { colors, radii, space, typography } from '@/src/theme';

type EditorState = {
  readonly index: number | null;
  readonly value: ManagedServiceDraft;
};

const emptyService: ManagedServiceDraft = {
  name: '',
  priceDzd: '',
  durationMinutes: '30',
  isActive: true,
};

export function ServicesEditor({
  services,
  error,
  onChange,
}: {
  readonly services: readonly ManagedServiceDraft[];
  readonly error?: WorkspaceValidationErrors['services'];
  readonly onChange: (services: readonly ManagedServiceDraft[]) => void;
}) {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const active = services.map((service, index) => ({ service, index })).filter(({ service }) => service.isActive !== false);
  const archived = services.map((service, index) => ({ service, index })).filter(({ service }) => service.isActive === false);

  const saveEditor = () => {
    if (!editor) return;
    if (editor.index === null) onChange([...services, editor.value]);
    else onChange(updateWorkspaceService(services, editor.index, editor.value));
    setEditor(null);
  };

  const archive = () => {
    if (!editor || editor.index === null) return;
    onChange(updateWorkspaceService(services, editor.index, { isActive: false }));
    setConfirmArchive(false);
    setEditor(null);
  };

  return (
    <View style={styles.section}>
      <View testID="services-overview-header" style={styles.overviewHeader}>
        <Button
          label="إضافة خدمة"
          onPress={() => setEditor({ index: null, value: { ...emptyService } })}
          style={styles.addButton}
        />
        <View style={styles.titleCopy}>
          <Text style={styles.title}>الخدمات المتاحة</Text>
          <Text style={styles.helper}>السعر والمدة لكل حجز</Text>
        </View>
      </View>

      {error ? (
        <Text style={styles.error}>
          {error === 'activeServiceRequired'
            ? 'أضف خدمة نشطة واحدة على الأقل.'
            : 'أكمل اسم كل خدمة وسعرها ومدتها بقيم صحيحة.'}
        </Text>
      ) : null}

      <View style={styles.list}>
        {active.map(({ service, index }) => (
          <Pressable
            key={service.id ?? `${service.name}-${index}`}
            accessibilityRole="button"
            accessibilityLabel={`تعديل خدمة ${service.name}`}
            onPress={() => setEditor({ index, value: { ...service } })}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.rowCopy}>
              <Text style={styles.serviceName}>{service.name || 'خدمة بدون اسم'}</Text>
              <View style={styles.serviceFacts}>
                <View style={styles.serviceFact}>
                  <Text style={styles.serviceFactValue}>{service.priceDzd || '0'} دج</Text>
                  <Text style={styles.serviceFactLabel}>السعر</Text>
                </View>
                <View style={styles.serviceFact}>
                  <Text style={styles.serviceFactValue}>{service.durationMinutes || '0'} دقيقة</Text>
                  <Text style={styles.serviceFactLabel}>المدة</Text>
                </View>
              </View>
            </View>
          </Pressable>
        ))}
        {!active.length ? <Text style={styles.empty}>أضف خدمتك الأولى لتظهر للحجز.</Text> : null}
      </View>

      {archived.length ? (
        <View style={styles.archivedSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="الخدمات المؤرشفة"
            accessibilityState={{ expanded: showArchived }}
            onPress={() => setShowArchived((value) => !value)}
            style={styles.archivedHeader}
          >
            <View style={styles.archivedTitleRow}>
              <Text style={styles.archivedTitle}>الخدمات المؤرشفة</Text>
              <Text style={styles.archivedCount}>{archived.length.toLocaleString('ar-DZ')}</Text>
            </View>
            <Icon name={showArchived ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
          </Pressable>
          {showArchived
            ? archived.map(({ service, index }) => (
                <View key={service.id ?? `${service.name}-${index}`} testID={`archived-service-${service.id ?? index}`} style={styles.archivedRow}>
                  <View testID={`archived-service-header-${service.id ?? index}`} style={styles.archivedServiceHeader}>
                    <Button
                      label="استعادة"
                      accessibilityLabel={`استعادة خدمة ${service.name}`}
                      onPress={() => onChange(updateWorkspaceService(services, index, { isActive: true }))}
                      style={styles.restore}
                    />
                    <Text style={styles.serviceName}>{service.name}</Text>
                  </View>
                  <View testID={`archived-service-facts-${service.id ?? index}`} style={styles.archivedFacts}>
                    <View style={styles.serviceFacts}>
                      <View style={styles.archivedFact}>
                        <Text style={styles.archivedFactValue}>{service.priceDzd} دج</Text>
                        <Text style={styles.archivedFactLabel}>السعر</Text>
                      </View>
                      <View style={styles.archivedFact}>
                        <Text style={styles.archivedFactValue}>{service.durationMinutes} دقيقة</Text>
                        <Text style={styles.archivedFactLabel}>المدة</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            : null}
        </View>
      ) : null}

      <Modal visible={editor !== null} transparent animationType="slide" onRequestClose={() => setEditor(null)}>
        <View style={styles.modalBackdrop}>
          {editor ? (
            <View style={styles.modalSheet} accessibilityViewIsModal>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editor.index === null ? 'إضافة خدمة' : 'تعديل الخدمة'}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" onPress={() => { setConfirmArchive(false); setEditor(null); }} style={styles.closeButton}>
                  <Icon name="close" size={22} />
                </Pressable>
              </View>
              <Field label="اسم الخدمة" value={editor.value.name} onChangeText={(name) => setEditor({ ...editor, value: { ...editor.value, name } })} />
              <Field label="السعر (دج)" value={editor.value.priceDzd} keyboardType="number-pad" onChangeText={(priceDzd) => setEditor({ ...editor, value: { ...editor.value, priceDzd } })} />
              <Field label="المدة (دقائق)" value={editor.value.durationMinutes} keyboardType="number-pad" onChangeText={(durationMinutes) => setEditor({ ...editor, value: { ...editor.value, durationMinutes } })} />
              {editor.index !== null && !confirmArchive ? (
                <Button label="أرشفة الخدمة" variant="danger" onPress={() => setConfirmArchive(true)} />
              ) : null}
              {editor.index !== null && confirmArchive ? (
                <View style={styles.archiveConfirm}>
                  <Text style={styles.archiveConfirmTitle}>هل تريد أرشفة هذه الخدمة؟</Text>
                  <Text style={styles.archiveConfirmBody}>لن تظهر للحجوزات الجديدة، وستبقى محفوظة في المواعيد السابقة.</Text>
                  <View style={styles.archiveConfirmActions}>
                    <Button label="إلغاء" variant="secondary" onPress={() => setConfirmArchive(false)} style={styles.action} />
                    <Button label="تأكيد الأرشفة" variant="dangerSolid" onPress={archive} style={styles.action} />
                  </View>
                </View>
              ) : null}
              <View style={styles.modalActions}>
                <Button label="إلغاء" variant="ghost" onPress={() => { setConfirmArchive(false); setEditor(null); }} style={styles.action} />
                <Button label="حفظ الخدمة" onPress={saveEditor} style={styles.action} />
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[4] },
  overviewHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  titleCopy: { flex: 1, gap: space[1] },
  title: { ...typography.titleSm, textAlign: 'right' },
  helper: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  addButton: { minHeight: 44, minWidth: 118, paddingHorizontal: space[3] },
  error: { ...typography.caption, color: colors.danger, textAlign: 'right' },
  list: { gap: space[2] },
  row: { minHeight: 82, flexDirection: 'row-reverse', alignItems: 'center', gap: space[3], borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, padding: space[3] },
  rowCopy: { flex: 1, gap: space[2], alignItems: 'flex-end' },
  serviceName: { ...typography.bodyStrong, textAlign: 'right' },
  serviceFacts: { flexDirection: 'row-reverse', gap: space[2] },
  serviceFact: { minWidth: 78, gap: 2, borderRadius: radii.sm, backgroundColor: colors.primarySoft, paddingHorizontal: space[2], paddingVertical: space[1], alignItems: 'center' },
  serviceFactValue: { ...typography.label, color: colors.primary, textAlign: 'center', fontVariant: ['tabular-nums'] },
  serviceFactLabel: { ...typography.caption, color: colors.primary, textAlign: 'center' },
  empty: { ...typography.caption, color: colors.textMuted, textAlign: 'right', paddingVertical: space[3] },
  pressed: { opacity: 0.7, borderColor: colors.primary },
  archivedSection: { borderTopWidth: 1, borderTopColor: colors.border },
  archivedHeader: { minHeight: 54, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  archivedTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[2] },
  archivedTitle: { ...typography.label, textAlign: 'right' },
  archivedCount: { ...typography.caption, color: colors.textMuted },
  archivedRow: { gap: space[3], borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted, padding: space[3] },
  archivedServiceHeader: { minHeight: 40, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  archivedFacts: { alignItems: 'flex-end' },
  archivedFact: { minWidth: 78, gap: 2, borderRadius: radii.sm, backgroundColor: colors.surface, paddingHorizontal: space[2], paddingVertical: space[1], alignItems: 'center' },
  archivedFactValue: { ...typography.label, color: colors.text, textAlign: 'center', fontVariant: ['tabular-nums'] },
  archivedFactLabel: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  restore: { minHeight: 40, minWidth: 82, paddingHorizontal: space[3] },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  modalSheet: { gap: space[4], borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, backgroundColor: colors.surface, padding: space[5] },
  modalHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { ...typography.titleSm, textAlign: 'right' },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  archiveConfirm: { gap: space[2], borderWidth: 1, borderColor: colors.danger, borderRadius: radii.lg, backgroundColor: colors.dangerSoft, padding: space[3] },
  archiveConfirmTitle: { ...typography.bodyStrong, color: colors.danger, textAlign: 'right' },
  archiveConfirmBody: { ...typography.caption, color: colors.textMuted, textAlign: 'right', lineHeight: 20 },
  archiveConfirmActions: { flexDirection: 'row-reverse', gap: space[2] },
  modalActions: { flexDirection: 'row-reverse', gap: space[2] },
  action: { flex: 1 },
});
