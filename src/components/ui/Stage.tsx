import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, radii, space } from '@/src/theme';

type Props = {
  readonly children: ReactNode;
  readonly footer?: ReactNode;
};

/** Bold teal header — Home greeting, Today, Scan, booking confirmation. */
export function Stage({ children, footer }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="teal-stage"
      style={[styles.stage, { paddingTop: Math.max(insets.top, layout.screenPaddingTop) }]}
    >
      <View style={styles.content}>{children}</View>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    backgroundColor: colors.stage,
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: space[10],
    borderBottomLeftRadius: radii['3xl'],
    borderBottomRightRadius: radii['3xl'],
    overflow: 'hidden',
  },
  content: {
    gap: space[3],
  },
});
