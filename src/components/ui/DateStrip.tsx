import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, radii, space, typography } from '@/src/theme';

const weekdayFormatter = new Intl.DateTimeFormat('ar-DZ', { timeZone: 'Africa/Algiers', weekday: 'short' });
const dayFormatter = new Intl.DateTimeFormat('ar-DZ', { timeZone: 'Africa/Algiers', day: 'numeric' });
const fullFormatter = new Intl.DateTimeFormat('ar-DZ', {
  timeZone: 'Africa/Algiers',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

type Props = {
  /** ISO dates (YYYY-MM-DD) the user may pick, in order. */
  readonly dates: readonly string[];
  readonly value: string;
  readonly onChange: (date: string) => void;
};

/** Horizontal day picker limited to the bookable window. Selected day is solid teal. */
export function DateStrip({ dates, value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      // Arabic reads right to left: start the strip at the right edge.
      style={styles.strip}
    >
      {dates.map((date) => {
        const day = new Date(`${date}T12:00:00Z`);
        const on = date === value;
        return (
          <Pressable
            key={date}
            accessibilityRole="button"
            accessibilityLabel={fullFormatter.format(day)}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(date)}
            style={({ pressed }) => [styles.day, on && styles.dayOn, pressed && !on && styles.dayPressed]}
          >
            <Text style={[styles.weekday, on && styles.textOn]}>{weekdayFormatter.format(day)}</Text>
            <Text style={[styles.number, on && styles.textOn]}>{dayFormatter.format(day)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: { flexGrow: 0, transform: [{ scaleX: -1 }] },
  row: { gap: space[2], paddingVertical: space[1] },
  day: {
    width: 60,
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    // Undo the strip's mirror so labels read normally.
    transform: [{ scaleX: -1 }],
  },
  dayOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  dayPressed: { backgroundColor: colors.background },
  weekday: { ...typography.caption, fontSize: 11, lineHeight: 16 },
  number: { ...typography.numeric, fontSize: 18, lineHeight: 26 },
  textOn: { color: colors.onPrimary },
});
