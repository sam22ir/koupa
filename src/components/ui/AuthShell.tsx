import type { Href } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, radii, space, typography } from '@/src/theme';

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

/**
 * Account screens: a teal brand header with the title, then the form on one
 * white sheet whose rounded top overlaps the header. Fields sit directly on the
 * sheet; no further cards inside it.
 */
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
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, space[3]) + space[2] }]}>
          <AuthHeader backHref={backHref} showBack={showBack} progress={progress} tone="stage" />
          <View style={styles.intro}>
            {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space[4]) + space[6] }]}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const SHEET_OVERLAP = 28;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.stage,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: space[6] + SHEET_OVERLAP,
    backgroundColor: colors.stage,
  },
  intro: {
    marginTop: space[6],
    gap: space[1],
  },
  kicker: {
    ...typography.label,
    color: colors.onPrimaryMuted,
    textAlign: 'right',
  },
  title: {
    ...typography.display,
    color: colors.onPrimary,
    textAlign: 'right',
  },
  subtitle: {
    ...typography.body,
    color: colors.onPrimaryMuted,
    textAlign: 'right',
  },
  sheet: {
    flexGrow: 1,
    marginTop: -SHEET_OVERLAP,
    paddingTop: space[6],
    paddingHorizontal: layout.screenPaddingX,
    gap: space[5],
    borderTopLeftRadius: radii['3xl'],
    borderTopRightRadius: radii['3xl'],
    backgroundColor: colors.surface,
  },
});
