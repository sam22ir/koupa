import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, motion, radii, space, typography } from '@/src/theme';

type Props = {
  readonly title: string;
  readonly subtitle?: string;
  /** Right-to-left trailing value, e.g. a price. */
  readonly value?: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly accessibilityLabel?: string;
  readonly leading?: ReactNode;
};

/** Single-choice row (services, options): white card, teal outline when chosen. */
export function OptionCard({ title, subtitle, value, selected, onPress, accessibilityLabel, leading }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join('، ')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        selected && styles.selected,
        pressed && { transform: [{ scale: motion.pressScale }] },
      ]}
    >
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      {leading}
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={styles.value}>{value}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 64,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  copy: { flex: 1, minWidth: 0, alignItems: 'flex-end', gap: 2 },
  title: { ...typography.bodyStrong, textAlign: 'right' },
  subtitle: { ...typography.caption, textAlign: 'right' },
  value: { ...typography.numeric, textAlign: 'left' },
});
