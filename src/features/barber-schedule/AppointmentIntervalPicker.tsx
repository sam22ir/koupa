import { Pressable, StyleSheet, Text, View } from 'react-native';

import { bookingIntervalOptions } from '@/src/features/barber-schedule/model';
import { colors, radii, space, typography } from '@/src/theme';

const labels: Record<number, string> = {
  5: '5 دقائق',
  10: '10 دقائق',
  15: '15 دقيقة',
  30: '30 دقيقة',
};

export type SegmentedOption = {
  readonly value: number;
  readonly label: string;
};

export function SegmentedOptionPicker({
  options,
  value,
  onChange,
  accessibilityLabelPrefix,
}: {
  readonly options: readonly SegmentedOption[];
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly accessibilityLabelPrefix?: string;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = value === option.value;
        const accessibilityLabel = accessibilityLabelPrefix
          ? `${accessibilityLabelPrefix}: ${option.label}`
          : option.label;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ checked: selected, selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function AppointmentIntervalPicker({
  value,
  onChange,
}: {
  readonly value: number;
  readonly onChange: (value: number) => void;
}) {
  return (
    <SegmentedOptionPicker
      options={bookingIntervalOptions.map((option) => ({ value: option, label: labels[option] }))}
      value={value}
      onChange={onChange}
    />
  );
}

const styles = StyleSheet.create({
  segmented: {
    minHeight: 48,
    flexDirection: 'row-reverse',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    padding: space[1],
  },
  segment: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  segmentSelected: { backgroundColor: colors.surface },
  segmentText: { ...typography.label, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  segmentTextSelected: { color: colors.primary },
});
