import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { colors } from '@/src/theme/colors';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  readonly name: IconName;
  readonly size?: number;
  readonly color?: string;
  readonly accessibilityLabel?: string;
};

/** App icon primitive — Ionicons via @expo/vector-icons. */
export function Icon({
  name,
  size = 22,
  color = colors.text,
  accessibilityLabel,
}: Props) {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
