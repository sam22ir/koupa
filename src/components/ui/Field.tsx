import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/fonts';
import { radii } from '@/src/theme/radii';
import { space } from '@/src/theme/spacing';
import { typography } from '@/src/theme/typography';

type Props = TextInputProps & {
  readonly label: string;
  readonly error?: string;
  readonly accessory?: ReactNode;
};

export function Field({
  label,
  error,
  accessory,
  style,
  accessibilityLabel,
  onBlur,
  onFocus,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, focused && styles.inputFocused, error && styles.inputError]}>
        <TextInput
          accessibilityLabel={accessibilityLabel ?? label}
          placeholderTextColor={colors.textMuted}
          textAlign="right"
          style={[styles.input, style]}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          {...rest}
        />
        {accessory}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[2],
  },
  label: {
    ...typography.label,
    textAlign: 'right',
  },
  inputRow: {
    minHeight: 48,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: space[4],
  },
  input: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 0,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
    paddingHorizontal: space[4] - 1,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'right',
  },
});
