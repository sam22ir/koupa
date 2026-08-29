import { type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spinner } from 'heroui-native/spinner';
import { Typography } from 'heroui-native/text';

import { colors, layout, space } from '@/src/theme';

type Props = {
  readonly children?: ReactNode;
  readonly scroll?: boolean;
  readonly loading?: boolean;
  readonly padded?: boolean;
  readonly style?: ViewStyle;
  readonly contentStyle?: ViewStyle;
};

export function Screen({
  children,
  scroll,
  loading,
  padded = true,
  style,
  contentStyle,
}: Props) {
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: Math.max(insets.top, space[3]),
    paddingBottom: Math.max(insets.bottom, space[4]),
    paddingHorizontal: padded ? layout.screenPaddingX : 0,
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center, style]}>
        <Spinner size="lg" color="accent" />
      </View>
    );
  }

  if (scroll) {
    return (
      <ScrollView
        style={[styles.root, style]}
        contentContainerStyle={[padding, styles.scrollContent, contentStyle]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        scrollEnabled
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={[styles.root, padding, style, contentStyle]}>{children}</View>;
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.titleBlock}>
      <Typography type="h5" align="end">{title}</Typography>
      {subtitle ? <Typography type="body" color="muted" align="end">{subtitle}</Typography> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    gap: space[4],
    flexGrow: 1,
  },
  titleBlock: {
    gap: space[1],
    alignItems: 'flex-end',
  },
});