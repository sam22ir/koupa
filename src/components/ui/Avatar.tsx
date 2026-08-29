import { type ViewStyle } from 'react-native';
import { Avatar as HeroAvatar } from 'heroui-native/avatar';

type Props = {
  readonly initials: string;
  readonly size?: number;
  readonly tone?: 'soft' | 'stage';
  readonly style?: ViewStyle;
};

export function Avatar({ initials, size = 44, tone = 'soft', style }: Props) {
  const avatarSize = size <= 32 ? 'sm' : size <= 48 ? 'md' : 'lg';
  return (
    <HeroAvatar
      size={avatarSize}
      color={tone === 'stage' ? 'default' : 'accent'}
      variant="soft"
      style={[{ width: size, height: size }, style]}
    >
      <HeroAvatar.Fallback>{initials}</HeroAvatar.Fallback>
    </HeroAvatar>
  );
}