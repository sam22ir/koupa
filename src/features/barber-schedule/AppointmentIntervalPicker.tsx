import { Pressable, StyleSheet, Text, View } from 'react-native';

import { bookingIntervalOptions } from '@/src/features/barber-schedule/model';
import { colors, radii, space, typography } from '@/src/theme';

const labels: Record<number, string> = {
  5: '5 دقائق',
  10: '10 دقائق',
  15: '15 دقيقة',
  30: '30 دقيقة',
};

export function AppointmentIntervalPicker({
  value,
  onChange,
}: {
  readonly value: number;
  readonly onChange: (value: number) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup">
      {bookingIntervalOptions.map((option) => {
        const selected = value === option;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityLabel={labels[option]}
            accessibilityState={{ checked: selected, selected }}
            onPress={() => onChange(option)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
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
