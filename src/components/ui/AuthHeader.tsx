import type { Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, space, typography } from '@/src/theme';

import { BackButton } from './BackButton';
import { BrandLogo } from './BrandLogo';

type Props = {
  readonly backHref?: Href;
  readonly showBack?: boolean;
  readonly progress?: string;
};

/** Shared brand row for account and profile setup screens. */
export function AuthHeader({ backHref = '/(auth)/welcome', showBack = true, progress }: Props) {
  return (
    <View testID="auth-shell-top-row" style={styles.row}>
      <BrandLogo height={38} />
      {progress ? (
        <View style={styles.progress}>
          <Text style={styles.progressText}>{progress}</Text>
        </View>
      ) : showBack ? (
        <BackButton fallback={backHref} tone="primary" />
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
  progressText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
  },
  spacer: { width: 42, height: 42 },
});
