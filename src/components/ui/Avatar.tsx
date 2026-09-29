import { type ViewStyle } from 'react-native';
import { Avatar as HeroAvatar } from 'heroui-native/avatar';

import { colors, fonts } from '@/src/theme';

type Props = {
  readonly initials: string;
  readonly size?: number;
  readonly tone?: 'soft' | 'stage';
  readonly style?: ViewStyle;
};

/** Rounded-square initials avatar; corners scale with size (~1/3). */
export function Avatar({ initials, size = 44, tone = 'soft', style }: Props) {
  const avatarSize = size <= 32 ? 'sm' : size <= 48 ? 'md' : 'lg';
  const onStage = tone === 'stage';
  return (
    <HeroAvatar
      size={avatarSize}
      color={onStage ? 'default' : 'accent'}
      variant="soft"
      style={[
        {
          width: size,
          height: size,
          borderRadius: Math.round(size / 3),
          backgroundColor: onStage ? colors.stageOverlay : colors.primarySoft,
        },
        style,
      ]}
    >
      <HeroAvatar.Fallback
        textProps={{ style: { fontFamily: fonts.bold, color: onStage ? colors.onPrimary : colors.primarySoftText } }}
      >
        {initials}
      </HeroAvatar.Fallback>
    </HeroAvatar>
  );
}
