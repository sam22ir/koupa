import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, space, typography } from '@/src/theme';

export type WorkspaceTab = 'schedule' | 'services' | 'rules';

const tabs: readonly { key: WorkspaceTab; label: string }[] = [
  { key: 'schedule', label: 'الجدول' },
  { key: 'services', label: 'الخدمات' },
  { key: 'rules', label: 'الإعدادات' },
];

export function ScheduleWorkspaceTabs({
  value,
  onChange,
  errors,
}: {
  readonly value: WorkspaceTab;
  readonly onChange: (value: WorkspaceTab) => void;
  readonly errors?: Partial<Record<WorkspaceTab, boolean>>;
}) {
  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = value === tab.key;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, selected && styles.selected]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{tab.label}</Text>
            {errors?.[tab.key] ? <View style={styles.errorDot} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 48,
    flexDirection: 'row-reverse',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    padding: space[1],
  },
  tab: {
    minWidth: 0,
    flex: 1,
    minHeight: 40,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
    borderRadius: radii.sm,
  },
  selected: {
    backgroundColor: colors.surface,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
  },
  selectedLabel: {
    color: colors.primary,
  },
  errorDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
});
