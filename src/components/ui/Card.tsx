import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, elevation, layout, radii } from '@/src/theme';

type Props = ViewProps & {
  readonly elevated?: boolean;
};

export function Card({ elevated, style, children, ...rest }: Props) {
  return (
    <View style={[styles.card, elevated && elevation.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: layout.cardPadding,
  },
});
