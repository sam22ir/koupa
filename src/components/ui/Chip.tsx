import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, space, typography } from '@/src/theme';

type Props = {
  readonly label: string;
  readonly tone?: 'neutral' | 'accent' | 'primary';
};

export function Chip({ label, tone = 'neutral' }: Props) {
  return (
    <View style={[styles.chip, toneStyles[tone]]}>
      <Text style={[styles.text, textStyles[tone]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radii.pill,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  text: {
    ...typography.chip,
  },
});

const toneStyles = StyleSheet.create({
  neutral: {
    backgroundColor: colors.background,
  },
  accent: {
    backgroundColor: colors.accentSoft,
  },
  primary: {
    backgroundColor: colors.primarySoft,
  },
});

const textStyles = StyleSheet.create({
  neutral: {
    color: colors.text,
  },
  accent: {
    color: colors.accentText,
  },
  primary: {
    color: colors.primary,
  },
});
