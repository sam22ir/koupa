import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, radii, typography } from '@/src/theme';

type Props = {
  readonly initials: string;
  readonly size?: number;
  readonly tone?: 'soft' | 'stage';
  readonly style?: ViewStyle;
};

export function Avatar({ initials, size = 44, tone = 'soft', style }: Props) {
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size > 40 ? radii.avatarSquare : radii.md,
          backgroundColor: tone === 'stage' ? colors.stageOverlay : colors.primarySoft,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: tone === 'stage' ? colors.onPrimary : colors.primary,
            fontSize: Math.max(12, size * 0.32),
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.label,
  },
});
