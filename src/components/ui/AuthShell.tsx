import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, radii, space, typography } from '@/src/theme';

import { BrandLogo } from './BrandLogo';
import { Card } from './Card';
import { Icon } from './Icon';

type Props = {
  readonly title: string;
  readonly subtitle?: string;
  readonly backHref?: Href;
  readonly children: ReactNode;
};

export function AuthShell({
  title,
  subtitle,
  backHref = '/(auth)/welcome',
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
      <View style={[styles.stage, { paddingTop: Math.max(insets.top, space[5]) }]}>
        <View style={styles.decor} />
        <View testID="auth-shell-top-row" style={styles.topRow}>
          <BrandLogo
            variant="full"
            height={44}
            imageStyle={styles.logoImage}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            onPress={() => router.replace(backHref)}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Icon name="arrow-forward" size={22} color={colors.onPrimary} />
          </Pressable>
        </View>
        <View style={styles.accent} />
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <Card elevated style={styles.card}>
        {children}
      </Card>
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
  stage: {
    minHeight: 190,
    overflow: 'hidden',
    backgroundColor: colors.stage,
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: space[12],
  },
  decor: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -72,
    left: -64,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  topRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoImage: {
    tintColor: colors.onPrimary,
    opacity: 0.96,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.stageOverlay,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  accent: {
    width: space[8],
    height: 3,
    marginTop: space[5],
    marginBottom: space[3],
    marginLeft: 'auto',
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  title: {
    ...typography.display,
    color: colors.onPrimary,
    textAlign: 'right',
    lineHeight: 38,
  },
  subtitle: {
    ...typography.body,
    color: colors.onPrimaryMuted,
    textAlign: 'right',
    lineHeight: 24,
    marginTop: space[1],
  },
  card: {
    marginTop: -space[7],
    marginHorizontal: layout.screenPaddingX,
    gap: space[4],
  },
});
