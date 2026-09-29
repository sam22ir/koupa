import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { DayScheduleDraft } from '@/src/data/onboarding';
import { Button, Icon } from '@/src/components/ui';
import { copyDaySchedule, type WorkspaceValidationErrors } from '@/src/features/barber-schedule/model';
import { colors, radii, space, typography } from '@/src/theme';

import { TimeField } from './TimeField';
import { WorkspaceSwitch } from './WorkspaceSwitch';

const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] as const;

const scheduleErrorCopy: Record<NonNullable<WorkspaceValidationErrors['schedule']>, string> = {
  workingDayRequired: 'فعّل يوم عمل واحدا على الأقل.',
  invalidHours: 'يجب أن يكون وقت البداية قبل وقت النهاية.',
  invalidBreak: 'تحقق من وقت بداية الاستراحة ونهايتها.',
  breakOutsideHours: 'يجب أن تكون الاستراحة ضمن ساعات العمل.',
  overlappingBreaks: 'لا يمكن أن تتداخل الاستراحات.',
};

function replaceDay(
  schedules: readonly DayScheduleDraft[],
  dayOfWeek: number,
  update: (day: DayScheduleDraft) => DayScheduleDraft,
) {
  return schedules.map((day) => (day.dayOfWeek === dayOfWeek ? update(day) : day));
}

export function WeeklyScheduleEditor({
  schedules,
  error,
  onChange,
}: {
  readonly schedules: readonly DayScheduleDraft[];
  readonly error?: WorkspaceValidationErrors['schedule'];
  readonly onChange: (schedules: readonly DayScheduleDraft[]) => void;
}) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [copySource, setCopySource] = useState<number | null>(null);
  const [copyTargets, setCopyTargets] = useState<readonly number[]>([]);

  const source = schedules.find((day) => day.dayOfWeek === copySource);

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>ساعات العمل الأسبوعية</Text>
        <Text style={styles.helper}>من الأحد إلى السبت</Text>
      </View>

      {error ? <Text style={styles.error}>{scheduleErrorCopy[error]}</Text> : null}

      <View style={styles.list}>
        {schedules.map((day) => {
          const expanded = day.dayOfWeek === expandedDay;
          const name = dayNames[day.dayOfWeek] ?? String(day.dayOfWeek);
          return (
            <View key={day.dayOfWeek} style={styles.dayRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`تعديل ${name}`}
                accessibilityState={{ expanded }}
                onPress={() => setExpandedDay(expanded ? null : day.dayOfWeek)}
                style={({ pressed }) => [styles.daySummary, pressed && styles.pressed]}
              >
                <View style={styles.dayCopy}>
                  <Text style={styles.dayName}>{name}</Text>
                  <Text style={[styles.dayMeta, !day.enabled && styles.closedText]}>
                    {day.enabled ? `${day.startsAt} - ${day.endsAt}` : 'مغلق'}
                  </Text>
                </View>
                <Icon
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>

              {expanded ? (
                <View style={styles.editor}>
                  <View style={styles.switchRow}>
                    <WorkspaceSwitch
                      label={`${name} مفتوح`}
                      value={day.enabled}
                      onValueChange={(enabled) =>
                        onChange(
                          replaceDay(schedules, day.dayOfWeek, (item) => ({ ...item, enabled })),
                        )
                      }
                    />
                    <Text style={styles.switchLabel}>{day.enabled ? 'يوم عمل' : 'يوم مغلق'}</Text>
                  </View>

                  {day.enabled ? (
                    <>
                      <View style={styles.timeRow}>
                        <TimeField
                          label="بداية العمل"
                          value={day.startsAt}
                          onChange={(startsAt) =>
                            onChange(
                              replaceDay(schedules, day.dayOfWeek, (item) => ({ ...item, startsAt })),
                            )
                          }
                        />
                        <TimeField
                          label="نهاية العمل"
                          value={day.endsAt}
                          onChange={(endsAt) =>
                            onChange(
                              replaceDay(schedules, day.dayOfWeek, (item) => ({ ...item, endsAt })),
                            )
                          }
                        />
                      </View>

                      {day.breaks.map((item, index) => (
                        <View key={`${index}-${item.startsAt}-${item.endsAt}`} style={styles.breakRow}>
                          <View style={styles.timeRow}>
                            <TimeField
                              label="بداية الاستراحة"
                              value={item.startsAt}
                              onChange={(startsAt) =>
                                onChange(
                                  replaceDay(schedules, day.dayOfWeek, (current) => ({
                                    ...current,
                                    breaks: current.breaks.map((value, valueIndex) =>
                                      valueIndex === index ? { ...value, startsAt } : value,
                                    ),
                                  })),
                                )
                              }
                            />
                            <TimeField
                              label="نهاية الاستراحة"
                              value={item.endsAt}
                              onChange={(endsAt) =>
                                onChange(
                                  replaceDay(schedules, day.dayOfWeek, (current) => ({
                                    ...current,
                                    breaks: current.breaks.map((value, valueIndex) =>
                                      valueIndex === index ? { ...value, endsAt } : value,
                                    ),
                                  })),
                                )
                              }
                            />
                          </View>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`حذف الاستراحة ${index + 1}`}
                            onPress={() =>
                              onChange(
                                replaceDay(schedules, day.dayOfWeek, (current) => ({
                                  ...current,
                                  breaks: current.breaks.filter((_, valueIndex) => valueIndex !== index),
                                })),
                              )
                            }
                            style={styles.removeAction}
                          >
                            <Icon name="trash-outline" size={18} color={colors.danger} />
                          </Pressable>
                        </View>
                      ))}

                      <View style={styles.actionRow}>
                        <Button
                          label="إضافة استراحة"
                          variant="secondary"
                          onPress={() =>
                            onChange(
                              replaceDay(schedules, day.dayOfWeek, (current) => ({
                                ...current,
                                breaks: [...current.breaks, { startsAt: '13:00', endsAt: '14:00' }],
                              })),
                            )
                          }
                          style={styles.action}
                        />
                        <Button
                          label="نسخ الأوقات"
                          variant="ghost"
                          onPress={() => {
                            setCopySource(day.dayOfWeek);
                            setCopyTargets([]);
                          }}
                          style={styles.action}
                        />
                      </View>
                    </>
                  ) : (
                    <Button
                      label="نسخ الأوقات"
                      variant="ghost"
                      onPress={() => {
                        setCopySource(day.dayOfWeek);
                        setCopyTargets([]);
                      }}
                    />
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <Modal
        visible={copySource !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCopySource(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet} accessibilityViewIsModal>
            <Text style={styles.modalTitle}>نسخ الأوقات إلى</Text>
            <Text style={styles.modalBody}>اختر الأيام التي ستأخذ نفس الساعات والاستراحات.</Text>
            {schedules
              .filter((day) => day.dayOfWeek !== copySource)
              .map((day) => {
                const checked = copyTargets.includes(day.dayOfWeek);
                const name = dayNames[day.dayOfWeek] ?? String(day.dayOfWeek);
                return (
                  <Pressable
                    key={day.dayOfWeek}
                    accessibilityRole="checkbox"
                    accessibilityLabel={name}
                    accessibilityState={{ checked }}
                    onPress={() =>
                      setCopyTargets((current) =>
                        checked
                          ? current.filter((value) => value !== day.dayOfWeek)
                          : [...current, day.dayOfWeek],
                      )
                    }
                    style={styles.checkRow}
                  >
                    <Text style={styles.checkLabel}>{name}</Text>
                    <Icon
                      name={checked ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={checked ? colors.primary : colors.textMuted}
                    />
                  </Pressable>
                );
              })}
            <View style={styles.modalActions}>
              <Button label="إلغاء" variant="ghost" onPress={() => setCopySource(null)} style={styles.action} />
              <Button
                label="تطبيق"
                disabled={!copyTargets.length}
                onPress={() => {
                  if (source) onChange(copyDaySchedule(source, copyTargets, schedules));
                  setCopySource(null);
                }}
                style={styles.action}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[4] },
  headingRow: { gap: space[1] },
  heading: { ...typography.titleSm, textAlign: 'right' },
  helper: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  error: { ...typography.caption, color: colors.danger, textAlign: 'right' },
  list: { borderTopWidth: 1, borderTopColor: colors.border },
  dayRow: { borderBottomWidth: 1, borderBottomColor: colors.border },
  daySummary: {
    minHeight: 64,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    paddingVertical: space[3],
  },
  dayCopy: { flex: 1, gap: space[1] },
  dayName: { ...typography.bodyStrong, textAlign: 'right' },
  dayMeta: { ...typography.caption, color: colors.primary, textAlign: 'right', fontVariant: ['tabular-nums'] },
  closedText: { color: colors.textMuted },
  editor: { gap: space[4], paddingBottom: space[5] },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space[3] },
  switchLabel: { ...typography.body, textAlign: 'right' },
  timeRow: { flexDirection: 'row-reverse', gap: space[3] },
  breakRow: { gap: space[2], borderRightWidth: 2, borderRightColor: colors.accent, paddingRight: space[3] },
  removeAction: { minHeight: 40, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: space[2] },
  actionRow: { flexDirection: 'row-reverse', gap: space[2] },
  action: { flex: 1 },
  pressed: { opacity: 0.65 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  modalSheet: {
    maxHeight: '86%',
    gap: space[3],
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: space[5],
  },
  modalTitle: { ...typography.titleSm, textAlign: 'right' },
  modalBody: { ...typography.body, color: colors.textMuted, textAlign: 'right' },
  checkRow: { minHeight: 48, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  checkLabel: { ...typography.body, textAlign: 'right' },
  modalActions: { flexDirection: 'row-reverse', gap: space[2], marginTop: space[2] },
});
