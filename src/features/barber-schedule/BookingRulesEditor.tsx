import { StyleSheet, Text, View } from 'react-native';

import {
  bookingWindowOptions,
  minimumNoticeOptions,
  type BarberSettingsDraft,
} from '@/src/barberSettings';
import { AppointmentIntervalPicker, SegmentedOptionPicker } from '@/src/features/barber-schedule/AppointmentIntervalPicker';
import type { WorkspaceValidationErrors } from '@/src/features/barber-schedule/model';
import { colors, space, typography } from '@/src/theme';

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
  const windowDays = Number(settings.bookingWindowDays);

  return (
    <View style={styles.section}>
      <View style={styles.headingCopy}>
        <Text style={styles.heading}>قواعد الحجز</Text>
        <Text style={styles.helper}>تحكم في الأوقات التي يستطيع الزبون اختيارها.</Text>
      </View>
      {error ? <Text style={styles.error}>اختر قيمة صحيحة لكل قاعدة حجز.</Text> : null}

      <View style={styles.ruleBlock}>
        <Text style={styles.label}>فاصل المواعيد</Text>
        <Text style={styles.description}>كم دقيقة بين كل موعد وآخر</Text>
        <AppointmentIntervalPicker
          value={settings.intervalMinutes}
          onChange={(intervalMinutes) => onChange({ intervalMinutes })}
        />
      </View>

      <View style={styles.ruleBlock}>
        <Text style={styles.label}>نافذة الحجز</Text>
        <Text style={styles.description}>كم يوما مسبقا يمكن للزبون أن يحجز.</Text>
        <SegmentedOptionPicker
          accessibilityLabelPrefix="نافذة الحجز"
          options={bookingWindowOptions.map((value) => ({
            value,
            label: value === 1 ? 'يوم' : value === 14 ? '14 يوما' : `${value} أيام`,
          }))}
          value={windowDays}
          onChange={(value) => onChange({ bookingWindowDays: String(value) })}
        />
      </View>

      <View style={styles.ruleBlock}>
        <Text style={styles.label}>الحد الأدنى للإشعار</Text>
        <Text style={styles.description}>كم دقيقة قبل الموعد يجب الحجز</Text>
        <SegmentedOptionPicker
          accessibilityLabelPrefix="الحد الأدنى للإشعار"
          options={minimumNoticeOptions.map((value) => ({ value, label: noticeLabels[value] }))}
          value={settings.minimumNoticeMinutes}
          onChange={(value) => onChange({ minimumNoticeMinutes: value })}
        />
      </View>
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
});
