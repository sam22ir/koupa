import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Field, Icon } from '@/src/components/ui';
import {
  removeWorkspaceException,
  upsertWorkspaceException,
  type ManagedScheduleExceptionDraft,
  type WorkspaceValidationErrors,
} from '@/src/features/barber-schedule/model';
import { emptyScheduleException, scheduleExceptionSummary } from '@/src/scheduleExceptions';
import { colors, radii, space, typography } from '@/src/theme';

import { TimeField } from './TimeField';
import { calendarToday, InlineDateCalendar } from './InlineDateCalendar';

const dateFormatter = new Intl.DateTimeFormat('ar-DZ', {
  timeZone: 'Africa/Algiers',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const exceptionErrors: Record<NonNullable<WorkspaceValidationErrors['exceptions']>, string> = {
  invalidDate: 'اختر تاريخا صحيحا.',
  invalidHours: 'يجب أن يكون وقت البداية قبل وقت النهاية.',
  duplicateDate: 'يوجد استثناء آخر في هذا التاريخ.',
};

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

export function ExceptionEditor({
  exceptions,
  error,
  onChange,
}: {
  readonly exceptions: readonly ManagedScheduleExceptionDraft[];
  readonly error?: WorkspaceValidationErrors['exceptions'];
  readonly onChange: (exceptions: readonly ManagedScheduleExceptionDraft[]) => void;
}) {
  const [editing, setEditing] = useState<ManagedScheduleExceptionDraft | null>(null);
  const [localError, setLocalError] = useState('');
  const minimumDate = calendarToday();
  const sorted = useMemo(
    () => [...exceptions].sort((left, right) => left.exceptionDate.localeCompare(right.exceptionDate)),
    [exceptions],
  );

  const close = () => {
    setEditing(null);
    setLocalError('');
  };

  const commit = () => {
    if (!editing) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editing.exceptionDate)) {
      setLocalError('اختر تاريخا بصيغة صحيحة.');
      return;
    }
    if (
      exceptions.some(
        (item) => item.exceptionDate === editing.exceptionDate && item.id !== editing.id,
      )
    ) {
      setLocalError('يوجد استثناء آخر في هذا التاريخ.');
      return;
    }
    onChange(upsertWorkspaceException(exceptions, editing));
    close();
  };

  return (
    <View style={styles.section}>
      <View style={styles.headingCopy}>
        <Text style={styles.heading}>استثناءات التواريخ</Text>
        <Text style={styles.helper}>للعطل أو لساعات مختلفة في يوم محدد</Text>
      </View>

      {error ? <Text style={styles.error}>{exceptionErrors[error]}</Text> : null}
      {sorted.length ? (
        <View style={styles.list}>
          {sorted.map((item) => (
            <Pressable
              key={item.id ?? item.exceptionDate}
              accessibilityRole="button"
              accessibilityLabel={`تعديل استثناء ${formatDate(item.exceptionDate)}`}
              onPress={() => setEditing({ ...item })}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.rowCopy}>
                <Text style={styles.date}>{formatDate(item.exceptionDate)}</Text>
                <Text style={styles.summary}>{scheduleExceptionSummary(item)}</Text>
                {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
              </View>
              <Icon name="create-outline" size={19} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>لا توجد استثناءات قادمة.</Text>
      )}

      <Button
        label="إضافة استثناء"
        variant="secondary"
        onPress={() => setEditing({ ...emptyScheduleException, exceptionDate: minimumDate })}
      />

      <Modal visible={editing !== null} transparent animationType="slide" onRequestClose={close}>
        <View style={styles.modalBackdrop}>
          {editing ? (
            <View style={styles.modalSheet} accessibilityViewIsModal>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editing.id ? 'تعديل الاستثناء' : 'استثناء جديد'}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" onPress={close} style={styles.closeButton}>
                  <Icon name="close" size={22} color={colors.text} />
                </Pressable>
              </View>
              <InlineDateCalendar
                value={editing.exceptionDate}
                minimumDate={minimumDate}
                onChange={(exceptionDate) => setEditing({ ...editing, exceptionDate })}
              />

              <View style={styles.modeGroup} accessibilityRole="radiogroup">
                {[
                  { value: true, label: 'مغلق طوال اليوم' },
                  { value: false, label: 'ساعات خاصة' },
                ].map((option) => {
                  const selected = editing.isClosed === option.value;
                  return (
                    <Pressable
                      key={option.label}
                      accessibilityRole="radio"
                      accessibilityLabel={option.label}
                      accessibilityState={{ selected }}
                      onPress={() => setEditing({ ...editing, isClosed: option.value })}
                      style={[styles.mode, selected && styles.modeSelected]}
                    >
                      <Text style={[styles.modeText, selected && styles.modeTextSelected]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {!editing.isClosed ? (
                <View style={styles.timeRow}>
                  <TimeField label="بداية الساعات الخاصة" value={editing.startsAt} onChange={(startsAt) => setEditing({ ...editing, startsAt })} />
                  <TimeField label="نهاية الساعات الخاصة" value={editing.endsAt} onChange={(endsAt) => setEditing({ ...editing, endsAt })} />
                </View>
              ) : null}
              <Field
                label="ملاحظة خاصة (اختياري)"
                value={editing.note}
                onChangeText={(note) => setEditing({ ...editing, note })}
                maxLength={160}
              />
              {localError ? <Text style={styles.error}>{localError}</Text> : null}

              {editing.id || exceptions.some((item) => item.exceptionDate === editing.exceptionDate) ? (
                <Button
                  label="إزالة الاستثناء"
                  variant="ghost"
                  onPress={() => {
                    onChange(removeWorkspaceException(exceptions, editing.id ?? editing.exceptionDate));
                    close();
                  }}
                />
              ) : null}
              <View style={styles.modalActions}>
                <Button label="إلغاء" variant="ghost" onPress={close} style={styles.action} />
                <Button label="إضافة إلى المسودة" onPress={commit} style={styles.action} />
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
  headingCopy: { flex: 1, gap: space[1] },
  heading: { ...typography.titleSm, textAlign: 'right' },
  helper: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  error: { ...typography.caption, color: colors.danger, textAlign: 'right' },
  list: { borderTopWidth: 1, borderTopColor: colors.border },
  row: { minHeight: 72, flexDirection: 'row-reverse', alignItems: 'center', gap: space[3], borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: space[3] },
  rowCopy: { flex: 1, gap: space[1] },
  date: { ...typography.bodyStrong, textAlign: 'right' },
  summary: { ...typography.caption, color: colors.primary, textAlign: 'right', fontVariant: ['tabular-nums'] },
  note: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  empty: { ...typography.body, color: colors.textMuted, textAlign: 'right', paddingVertical: space[2] },
  pressed: { opacity: 0.65 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,30,38,0.42)' },
  modalSheet: { maxHeight: '92%', gap: space[4], borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, backgroundColor: colors.surface, padding: space[5] },
  modalHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { ...typography.titleSm, textAlign: 'right' },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  modeGroup: { flexDirection: 'row-reverse', gap: space[2] },
  mode: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  modeSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  modeText: { ...typography.label, color: colors.textMuted },
  modeTextSelected: { color: colors.primary },
  timeRow: { flexDirection: 'row-reverse', gap: space[3] },
  modalActions: { flexDirection: 'row-reverse', gap: space[2] },
  action: { flex: 1 },
});
