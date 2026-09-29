import type { Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, space, typography } from '@/src/theme';

import { BackButton } from './BackButton';
import { BrandLogo } from './BrandLogo';

type Props = {
  readonly backHref?: Href;
  readonly showBack?: boolean;
  readonly progress?: string;
  /** `stage` sits on the teal auth header (white logo, translucent controls). */
  readonly tone?: 'paper' | 'stage';
};

/** Shared brand row for account and profile setup screens. */
export function AuthHeader({ backHref = '/(auth)/welcome', showBack = true, progress, tone = 'paper' }: Props) {
  const stage = tone === 'stage';
  return (
    <View testID="auth-shell-top-row" style={styles.row}>
      <BrandLogo height={38} imageStyle={stage ? { tintColor: colors.onPrimary } : undefined} />
      {progress ? (
        <View style={[styles.progress, stage && styles.progressStage]}>
          <Text style={[styles.progressText, stage && styles.progressTextStage]}>{progress}</Text>
        </View>
      ) : showBack ? (
        <BackButton fallback={backHref} tone={stage ? 'onPrimary' : 'primary'} />
      ) : <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progress: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: space[3],
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  progressStage: {
    borderColor: colors.stageBorder,
    backgroundColor: colors.stageOverlay,
  },
  progressText: {
    ...typography.label,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  progressTextStage: { color: colors.onPrimary },
  spacer: { width: 44, height: 44 },
});
