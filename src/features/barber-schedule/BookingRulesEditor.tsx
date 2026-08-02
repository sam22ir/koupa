import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  bookingWindowOptions,
  minimumNoticeOptions,
  type BarberSettingsDraft,
} from '@/src/barberSettings';
import { Button, Icon } from '@/src/components/ui';
import { AppointmentIntervalPicker } from '@/src/features/barber-schedule/AppointmentIntervalPicker';
import type { WorkspaceValidationErrors } from '@/src/features/barber-schedule/model';
import { colors, radii, space, typography } from '@/src/theme';

type Menu = 'window' | 'notice' | null;

const noticeLabels: Record<number, string> = {
  0: 'بدون',
  30: '30 دقيقة',
  60: 'ساعة',
  120: 'ساعتان',
};

export function BookingRulesEditor({
  settings,
  error,
  onChange,
}: {
  readonly settings: BarberSettingsDraft;
  readonly error?: WorkspaceValidationErrors['rules'];
  readonly onChange: (patch: Partial<BarberSettingsDraft>) => void;
}) {
  const [menu, setMenu] = useState<Menu>(null);
  const windowDays = Number(settings.bookingWindowDays);

  const options = menu === 'window' ? bookingWindowOptions : minimumNoticeOptions;
  const selected = menu === 'window' ? windowDays : settings.minimumNoticeMinutes;

  return (
    <View style={styles.section}>
      <View style={styles.headingCopy}>
        <Text style={styles.heading}>قواعد الحجز</Text>
        <Text style={styles.helper}>تحكم في الأوقات التي يستطيع الزبون اختيارها.</Text>
      </View>
      {error ? <Text style={styles.error}>اختر قيمة صحيحة لكل قاعدة حجز.</Text> : null}

      <View style={styles.ruleBlock}>
        <Text style={styles.label}>فاصل المواعيد</Text>
        <Text style={styles.description}>المسافة بين بدايات المواعيد المتاحة.</Text>
        <AppointmentIntervalPicker
          value={settings.intervalMinutes}
          onChange={(intervalMinutes) => onChange({ intervalMinutes })}
        />
      </View>

      <View style={styles.ruleBlock}>
        <Text style={styles.label}>نافذة الحجز</Text>
        <Text style={styles.description}>كم يوما مسبقا يمكن للزبون أن يحجز.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`نافذة الحجز: ${windowDays} أيام`}
          onPress={() => setMenu('window')}
          style={styles.select}
        >
          <Text style={styles.selectValue}>{windowDays} أيام</Text>
          <Icon name="chevron-down" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.ruleBlock}>
        <Text style={styles.label}>الحد الأدنى للإشعار</Text>
        <Text style={styles.description}>المدة المطلوبة قبل بداية الموعد.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`الحد الأدنى للإشعار: ${noticeLabels[settings.minimumNoticeMinutes] ?? settings.minimumNoticeMinutes}`}
          onPress={() => setMenu('notice')}
          style={styles.select}
        >
          <Text style={styles.selectValue}>{noticeLabels[settings.minimumNoticeMinutes] ?? settings.minimumNoticeMinutes}</Text>
          <Icon name="chevron-down" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <Modal visible={menu !== null} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet} accessibilityViewIsModal>
            <Text style={styles.modalTitle}>{menu === 'window' ? 'نافذة الحجز' : 'الحد الأدنى للإشعار'}</Text>
            <View accessibilityRole="radiogroup">
              {options.map((value) => {
                const checked = selected === value;
                const label = menu === 'window' ? `${value} أيام` : noticeLabels[value];
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLabel={label}
                    accessibilityState={{ checked, selected: checked }}
                    onPress={() => {
                      if (menu === 'window') onChange({ bookingWindowDays: String(value) });
                      else onChange({ minimumNoticeMinutes: value });
                      setMenu(null);
                    }}
                    style={styles.optionRow}
                  >
                    <Text style={[styles.optionText, checked && styles.optionTextSelected]}>{label}</Text>
                    <Icon name={checked ? 'radio-button-on' : 'radio-button-off'} size={21} color={checked ? colors.primary : colors.textMuted} />
                  </Pressable>
                );
              })}
            </View>
            <Button label="إلغاء" variant="ghost" onPress={() => setMenu(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[6] },
  headingCopy: { gap: space[1] },
  heading: { ...typography.titleSm, textAlign: 'right' },
  helper: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  error: { ...typography.caption, color: colors.danger, textAlign: 'right' },
  ruleBlock: { gap: space[2] },
  label: { ...typography.bodyStrong, textAlign: 'right' },
  description: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  select: { minHeight: 50, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, paddingHorizontal: space[4] },
  selectValue: { ...typography.body, textAlign: 'right' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,30,38,0.42)' },
  modalSheet: { gap: space[3], borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, backgroundColor: colors.surface, padding: space[5] },
  modalTitle: { ...typography.titleSm, textAlign: 'right' },
  optionRow: { minHeight: 52, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border },
  optionText: { ...typography.body, textAlign: 'right' },
  optionTextSelected: { color: colors.primary },
});
