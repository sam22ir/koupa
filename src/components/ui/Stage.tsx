import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, radii, space } from '@/src/theme';

type Props = {
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  /** Leave room for the first body card to float over the lower edge. */
  readonly overlap?: boolean;
};

/** Bold teal header — Home greeting, Today, Scan, booking confirmation. */
export function Stage({ children, footer, overlap = false }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="teal-stage"
      style={[
        styles.stage,
        {
          paddingTop: Math.max(insets.top, layout.screenPaddingTop),
          paddingBottom: overlap ? space[6] - layout.stageBodyOverlap : space[10],
        },
      ]}
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
    borderBottomLeftRadius: radii['3xl'],
    borderBottomRightRadius: radii['3xl'],
    overflow: 'hidden',
  },
  content: {
    gap: space[3],
  },
});
