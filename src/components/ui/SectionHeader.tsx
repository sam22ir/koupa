import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, space, typography } from '@/src/theme';

type Props = {
  readonly title: string;
  readonly hint?: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
};

/** Section heading on paper: title on the reading edge, optional quiet action opposite. */
export function SectionHeader({ title, hint, actionLabel, onAction }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          hitSlop={8}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space[3],
  },
  copy: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  title: { ...typography.titleSm, textAlign: 'right' },
  hint: { ...typography.caption, textAlign: 'right' },
  action: { ...typography.label, color: colors.primarySoftText },
  pressed: { opacity: 0.6 },
});
