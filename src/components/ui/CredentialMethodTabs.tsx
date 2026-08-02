import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CredentialMethod } from '@/src/auth';
import { colors, space, typography } from '@/src/theme';

type Props = {
  readonly value: CredentialMethod;
  readonly onChange: (value: CredentialMethod) => void;
  readonly emailLabel: string;
  readonly phoneLabel: string;
};

export function CredentialMethodTabs({ value, onChange, emailLabel, phoneLabel }: Props) {
  return (
    <View style={styles.root}>
      {(['email', 'phone'] as const).map((method) => {
        const active = value === method;
        const label = method === 'email' ? emailLabel : phoneLabel;
        return (
          <Pressable
            key={method}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(method)}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row-reverse',
    gap: space[1],
    padding: space[1],
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
  },
  tab: {
    flex: 1,
    paddingVertical: space[3],
    borderRadius: 11,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.surface,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.primary,
  },
});
