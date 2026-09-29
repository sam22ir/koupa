import type { Href } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from 'heroui-native/text';

import { colors, layout, space, typography } from '@/src/theme';

import { AuthHeader } from './AuthHeader';

type Props = {
  readonly title: string;
  readonly subtitle?: string;
  /** Plain-text line above the title. Carries the one fact that frames the form. */
  readonly kicker?: string;
  readonly progress?: string;
  readonly backHref?: Href;
  readonly showBack?: boolean;
  readonly children: ReactNode;
};

export function AuthShell({
  title,
  subtitle,
  kicker,
  progress,
  backHref = '/(auth)/welcome',
  showBack = true,
  children,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, space[6]) }]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, space[5]) }]}>
        <AuthHeader backHref={backHref} showBack={showBack} progress={progress} />
        <View style={styles.intro}>
          {kicker ? <Typography type="body-xs" align="end" style={styles.kicker}>{kicker}</Typography> : null}
          <Typography type="h3" align="end" style={styles.title}>{title}</Typography>
          {subtitle ? <Typography type="body" align="end" style={styles.subtitle}>{subtitle}</Typography> : null}
        </View>
      </View>

      {/* Fields bring their own surfaces, so the form sits on paper rather than
          inside a second container. */}
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: space[4],
  },
  intro: {
    marginTop: space[9],
    gap: space[1],
  },
  kicker: {
    fontFamily: typography.label.fontFamily,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.primary,
  },
  title: {
    lineHeight: 38,
  },
  subtitle: {
    ...typography.body,
    lineHeight: 24,
  },
  body: {
    paddingHorizontal: layout.screenPaddingX,
    gap: space[5],
  },
});
