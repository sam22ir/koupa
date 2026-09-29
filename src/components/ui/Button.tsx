import { type ViewStyle } from 'react-native';
import { Button as HeroButton } from 'heroui-native/button';
import { useThemeColor } from 'heroui-native/hooks';
import { Spinner } from 'heroui-native/spinner';

import { colors } from '@/src/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dangerSolid' | 'onStage';

type Props = {
  readonly label: string;
  readonly onPress?: () => void;
  readonly variant?: Variant;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly style?: ViewStyle;
  readonly accessibilityLabel?: string;
  readonly testID?: string;
};

/**
 * Primary: solid teal. Secondary: soft teal. Outline: white with a hairline.
 * Danger: soft red for the first tap; dangerSolid for the final confirmation.
 * OnStage: white with teal text, for the one action on a teal header.
 */
const variantMap: Record<Variant, 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger-soft' | 'danger'> = {
  primary: 'primary',
  secondary: 'secondary',
  outline: 'outline',
  ghost: 'ghost',
  danger: 'danger-soft',
  dangerSolid: 'danger',
  onStage: 'secondary',
};

const onStageStyle: ViewStyle = { backgroundColor: colors.surface };

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  accessibilityLabel,
  testID,
}: Props) {
  const isDisabled = disabled || loading;
  const spinnerColor = useThemeColor(
    variant === 'primary' || variant === 'dangerSolid' ? 'accent-foreground' : variant === 'danger' ? 'danger' : 'accent',
  );

  return (
    <HeroButton
      variant={variantMap[variant]}
      isDisabled={isDisabled}
      onPress={onPress}
      style={variant === 'onStage' ? [onStageStyle, style] : style}
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
    >
      {loading ? (
        <Spinner size="sm" color={spinnerColor} />
      ) : (
        <HeroButton.Label>{label}</HeroButton.Label>
      )}
    </HeroButton>
  );
}