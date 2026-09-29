import { StyleSheet, Text, View } from 'react-native';

import { appointmentStatusLabel, type AppointmentStatus } from '@/src/booking';
import { colors, radii, space, typography } from '@/src/theme';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const toneColors: Record<StatusTone, { readonly bg: string; readonly fg: string }> = {
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
  neutral: { bg: colors.surfaceMuted, fg: colors.textMuted },
};

/** Booked is upcoming (teal info); attendance is success; missed or cancelled is danger. */
export function appointmentStatusTone(status: AppointmentStatus): StatusTone {
  switch (status) {
    case 'booked':
      return 'info';
    case 'present':
      return 'success';
    case 'completed':
      return 'neutral';
    case 'absent':
    case 'cancelled':
      return 'danger';
  }
}

type Props = {
  readonly label: string;
  readonly tone?: StatusTone;
};

/** Pill with a dot and a word. Color is never the only signal: the label says it. */
export function StatusBadge({ label, tone = 'neutral' }: Props) {
  const { bg, fg } = toneColors[tone];
  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function AppointmentStatusBadge({ status }: { readonly status: AppointmentStatus }) {
  return <StatusBadge label={appointmentStatusLabel(status)} tone={appointmentStatusTone(status)} />;
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[1] + 2,
    minHeight: 26,
    paddingHorizontal: space[2] + 2,
    borderRadius: radii.pill,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    ...typography.label,
    fontSize: 12,
    lineHeight: 18,
  },
});
