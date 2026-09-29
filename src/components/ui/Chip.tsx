import { StyleSheet } from 'react-native';
import { Chip as HeroChip } from 'heroui-native/chip';

import { colors, fonts } from '@/src/theme';

type Tone = 'neutral' | 'accent' | 'primary';

type Props = {
  readonly label: string;
  readonly tone?: Tone;
  readonly selected?: boolean;
  readonly onPress?: () => void;
  readonly accessibilityLabel?: string;
};

const colorMap: Record<Tone, 'accent' | 'default' | 'warning'> = {
  neutral: 'default',
  accent: 'warning',
  primary: 'accent',
};

/**
 * Koupa Teal chip: outlined white when idle, solid ink when selected, soft
 * teal/amber for informational tones.
 */
export function Chip({ label, tone = 'neutral', selected = false, onPress, accessibilityLabel }: Props) {
  const outlined = !selected && tone === 'neutral';
  return (
    <HeroChip
      variant={selected ? 'primary' : 'soft'}
      color={selected ? 'default' : colorMap[tone]}
      onPress={onPress}
      style={selected ? styles.selected : outlined ? styles.outlined : undefined}
      accessibilityLabel={accessibilityLabel ?? label}
      {...(onPress ? { accessibilityRole: 'button' as const, accessibilityState: { selected } } : {})}
    >
      <HeroChip.Label style={[styles.label, selected ? styles.selectedLabel : null]}>{label}</HeroChip.Label>
    </HeroChip>
  );
}

const styles = StyleSheet.create({
  outlined: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: {
    backgroundColor: colors.text,
  },
  label: {
    fontFamily: fonts.medium,
  },
  selectedLabel: {
    color: colors.onPrimary,
  },
});
