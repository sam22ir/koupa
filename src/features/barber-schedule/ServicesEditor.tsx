import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

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
    Alert.alert(
      'أرشفة الخدمة',
      'لن تظهر هذه الخدمة للحجوزات الجديدة، وستبقى محفوظة في المواعيد السابقة.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'أرشفة',
          style: 'destructive',
          onPress: () => {
            onChange(updateWorkspaceService(services, editor.index as number, { isActive: false }));
            setEditor(null);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.titleCopy}>
        <Text style={styles.title}>الخدمات المتاحة</Text>
        <Text style={styles.helper}>السعر بالدينار والمدة بالدقائق</Text>
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
              <Text style={styles.serviceMeta}>
                {service.priceDzd || '0'} دج · {service.durationMinutes || '0'} دقيقة
              </Text>
            </View>
            <Icon name="create-outline" size={19} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>

      <Button
        label="إضافة خدمة"
        variant="secondary"
        onPress={() => setEditor({ index: null, value: { ...emptyService } })}
      />

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
                <View key={service.id ?? `${service.name}-${index}`} style={styles.archivedRow}>
                  <View style={styles.rowCopy}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <Text style={styles.serviceMeta}>{service.priceDzd} دج · {service.durationMinutes} دقيقة</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`استعادة خدمة ${service.name}`}
                    onPress={() => onChange(updateWorkspaceService(services, index, { isActive: true }))}
                    style={styles.restore}
                  >
                    <Text style={styles.restoreText}>استعادة</Text>
                  </Pressable>
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
                <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" onPress={() => setEditor(null)} style={styles.closeButton}>
                  <Icon name="close" size={22} />
                </Pressable>
              </View>
              <Field label="اسم الخدمة" value={editor.value.name} onChangeText={(name) => setEditor({ ...editor, value: { ...editor.value, name } })} />
              <Field label="السعر (دج)" value={editor.value.priceDzd} keyboardType="number-pad" onChangeText={(priceDzd) => setEditor({ ...editor, value: { ...editor.value, priceDzd } })} />
              <Field label="المدة (دقائق)" value={editor.value.durationMinutes} keyboardType="number-pad" onChangeText={(durationMinutes) => setEditor({ ...editor, value: { ...editor.value, durationMinutes } })} />
              {editor.index !== null ? <Button label="أرشفة الخدمة" variant="ghost" onPress={archive} /> : null}
              <View style={styles.modalActions}>
                <Button label="إلغاء" variant="ghost" onPress={() => setEditor(null)} style={styles.action} />
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
  titleCopy: { flex: 1, gap: space[1] },
  title: { ...typography.titleSm, textAlign: 'right' },
  helper: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  error: { ...typography.caption, color: colors.danger, textAlign: 'right' },
  list: { borderTopWidth: 1, borderTopColor: colors.border },
  row: { minHeight: 68, flexDirection: 'row-reverse', alignItems: 'center', gap: space[3], borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: space[3] },
  rowCopy: { flex: 1, gap: space[1] },
  serviceName: { ...typography.bodyStrong, textAlign: 'right' },
  serviceMeta: { ...typography.caption, color: colors.textMuted, textAlign: 'right', fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.65 },
  archivedSection: { borderTopWidth: 1, borderTopColor: colors.border },
  archivedHeader: { minHeight: 54, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  archivedTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[2] },
  archivedTitle: { ...typography.label, textAlign: 'right' },
  archivedCount: { ...typography.caption, color: colors.textMuted },
  archivedRow: { minHeight: 64, flexDirection: 'row-reverse', alignItems: 'center', gap: space[3], borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: space[3] },
  restore: { minHeight: 40, justifyContent: 'center', paddingHorizontal: space[2] },
  restoreText: { ...typography.label, color: colors.primary },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,30,38,0.42)' },
  modalSheet: { gap: space[4], borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, backgroundColor: colors.surface, padding: space[5] },
  modalHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { ...typography.titleSm, textAlign: 'right' },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  modalActions: { flexDirection: 'row-reverse', gap: space[2] },
  action: { flex: 1 },
});
