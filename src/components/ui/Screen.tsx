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

import { colors, elevation, layout, space } from '@/src/theme';
import { PageHeaderIdentity } from './CustomerStageHeader';

type Props = {
  readonly children?: ReactNode;
  readonly scroll?: boolean;
  readonly loading?: boolean;
  readonly padded?: boolean;
  readonly style?: ViewStyle;
  readonly contentStyle?: ViewStyle;
  /** Let the first child (a teal header) run under the status bar; it pads itself. */
  readonly bleedTop?: boolean;
  /** Sticky action bar pinned below the content (e.g. the booking CTA). */
  readonly footer?: ReactNode;
};

export function Screen({
  children,
  scroll,
  loading,
  padded = true,
  style,
  contentStyle,
  bleedTop = false,
  footer,
}: Props) {
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: bleedTop ? 0 : Math.max(insets.top, space[3]),
    paddingBottom: footer ? space[6] : Math.max(insets.bottom, space[4]),
    paddingHorizontal: padded ? layout.screenPaddingX : 0,
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center, style]}>
        <Spinner size="lg" color="accent" />
      </View>
    );
  }

  const footerBar = footer ? (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space[4]) }]}>{footer}</View>
  ) : null;

  if (scroll) {
    const scroller = (
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
    if (!footerBar) return scroller;
    return (
      <View style={[styles.root, style]}>
        {scroller}
        {footerBar}
      </View>
    );
  }

  if (!footerBar) return <View style={[styles.root, padding, style, contentStyle]}>{children}</View>;
  return (
    <View style={[styles.root, style]}>
      <View style={[styles.fill, padding, contentStyle]}>{children}</View>
      {footerBar}
    </View>
  );
}

export function ScreenTitle({
  title,
  subtitle,
  context,
  trailing,
}: {
  title: string;
  subtitle?: string;
  context?: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.pageMasthead}>
      <PageHeaderIdentity context={context} trailing={trailing} />
      <View style={styles.pageHeading}>
        <Typography type="h3" align="end">{title}</Typography>
        {subtitle ? <Typography type="body" color="muted" align="end">{subtitle}</Typography> : null}
      </View>
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
  fill: {
    flex: 1,
  },
  footer: {
    gap: space[2],
    paddingTop: space[3],
    paddingHorizontal: layout.screenPaddingX,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    ...elevation.float,
  },
  scrollContent: {
    gap: space[4],
    flexGrow: 1,
  },
  pageMasthead: {
    gap: space[4],
  },
  pageHeading: {
    gap: space[2],
    alignItems: 'flex-end',
  },
});
