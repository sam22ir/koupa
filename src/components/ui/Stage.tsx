import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, space } from '@/src/theme';

type Props = {
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly decoration?: 'default' | 'subtle' | 'none';
};

/** Teal Stage hero block — top surface for key screens. */
export function Stage({ children, footer, decoration = 'default' }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.stage, { paddingTop: Math.max(insets.top, layout.screenPaddingTop) }]}>
      {decoration === 'none' ? null : (
        <View style={[styles.decor, decoration === 'subtle' && styles.decorSubtle]} />
      )}
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
    overflow: 'hidden',
  },
  decor: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.stageDecor,
    top: -40,
    left: -50,
  },
  decorSubtle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.035)',
    top: -60,
    left: -64,
  },
  content: {
    gap: space[3],
  },
});
