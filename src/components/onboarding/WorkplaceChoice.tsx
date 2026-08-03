import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, space, typography } from '@/src/theme';

export type WorkplaceType = 'owner' | 'worker';

export function WorkplaceChoice({
  value,
  onChange,
}: {
  readonly value: WorkplaceType;
  readonly onChange: (value: WorkplaceType) => void;
}) {
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="الوضع المهني">
      <Text style={styles.label}>الوضع المهني</Text>
      <View style={styles.options}>
        {([
          ['owner', 'أملك محلا', 'أدير محلي وأستقبل الحجوزات.'],
          ['worker', 'أعمل في محل', 'أنضم إلى محل بعد نشر ملفي.'],
        ] as const).map(([option, title, body]) => {
          const selected = value === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityLabel={title}
              accessibilityState={{ selected, checked: selected }}
              onPress={() => onChange(option)}
              style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
            >
              <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{title}</Text>
              <Text style={[styles.optionBody, selected && styles.optionBodySelected]}>{body}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  label: { ...typography.label, textAlign: 'right' },
  options: { flexDirection: 'row-reverse', gap: space[2] },
  option: {
    flex: 1,
    minHeight: 88,
    gap: space[1],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: space[3],
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft, borderWidth: 2 },
  optionTitle: { ...typography.bodyStrong, textAlign: 'right', color: colors.text },
  optionTitleSelected: { color: colors.primary },
  optionBody: { ...typography.caption, textAlign: 'right' },
  optionBodySelected: { color: colors.text },
  pressed: { opacity: 0.82 },
});
