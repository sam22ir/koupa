import type { IconName } from '@/src/components/ui/Icon';
import { Icon } from '@/src/components/ui/Icon';
import { colors } from '@/src/theme/colors';

type Props = {
  readonly name: IconName;
  readonly focused: boolean;
  readonly size?: number;
};

export function TabIcon({ name, focused, size = 22 }: Props) {
  return (
    <Icon
      name={name}
      size={size}
      color={focused ? colors.primary : colors.textMuted}
    />
  );
}
