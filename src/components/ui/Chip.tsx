import { Chip as HeroChip } from 'heroui-native/chip';

type Props = {
  readonly label: string;
  readonly tone?: 'neutral' | 'accent' | 'primary';
  readonly selected?: boolean;
  readonly onPress?: () => void;
  readonly accessibilityLabel?: string;
};

const variantMap: Record<string, 'primary' | 'secondary' | 'soft'> = {
  neutral: 'secondary',
  accent: 'soft',
  primary: 'soft',
};

const colorMap: Record<string, 'accent' | 'default' | 'warning'> = {
  neutral: 'default',
  accent: 'warning',
  primary: 'accent',
};

export function Chip({ label, tone = 'neutral', selected = false, onPress, accessibilityLabel }: Props) {
  const resolvedTone = selected ? 'primary' : tone;
  return (
    <HeroChip
      variant={selected ? 'primary' : variantMap[resolvedTone]}
      color={selected ? 'accent' : colorMap[resolvedTone]}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? label}
      {...(onPress ? { accessibilityRole: 'button' as const } : {})}
    >
      <HeroChip.Label>{label}</HeroChip.Label>
    </HeroChip>
  );
}