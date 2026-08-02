import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, space, typography } from '@/src/theme';

import { BrandLogo } from './BrandLogo';
import { Stage } from './Stage';

type Props = {
  readonly title: string;
  readonly subtitle?: string;
  readonly trailing?: ReactNode;
};

/** Shared full white Koupa lockup used by customer and barber workspaces. */
export function CustomerStageHeader({ title, subtitle, trailing }: Props) {
  return (
    <Stage decoration="subtle">
      <View style={styles.stageTopRow}>
        <View style={styles.logoWrap}>
          <BrandLogo variant="full" height={56} imageStyle={styles.logoImage} />
          <View style={styles.logoAccent} />
        </View>
        {trailing}
      </View>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </Stage>
  );
}

const styles = StyleSheet.create({
  stageTopRow: { minHeight: 58, position: 'relative' },
  logoWrap: { position: 'absolute', left: 0, top: 0, alignItems: 'center', gap: space[2] },
  logoImage: { tintColor: colors.onPrimary, opacity: 0.96 },
  logoAccent: { width: space[6], height: 3, borderRadius: radii.pill, backgroundColor: colors.accent },
  titleBlock: { gap: space[1], alignItems: 'flex-end' },
  title: { ...typography.title, color: colors.onPrimary, textAlign: 'right' },
  subtitle: { ...typography.body, color: colors.onPrimaryMuted, textAlign: 'right' },
});
