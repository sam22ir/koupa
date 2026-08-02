import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { colors } from '@/src/theme';

export function WorkspaceSwitch({
  label,
  value,
  onValueChange,
}: {
  readonly label: string;
  readonly value: boolean;
  readonly onValueChange: (value: boolean) => void;
}) {
  if (Platform.OS !== 'web') {
    return (
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
      />
    );
  }

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={[styles.track, value && styles.trackActive]}
    >
      <View style={[styles.thumb, value ? styles.thumbActive : styles.thumbInactive]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 24,
    flexShrink: 0,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  trackActive: { backgroundColor: colors.primary },
  thumb: {
    position: 'absolute',
    top: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surface,
  },
  thumbInactive: { left: 3 },
  thumbActive: { left: 23 },
});
