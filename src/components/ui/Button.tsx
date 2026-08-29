import { type ViewStyle } from 'react-native';
import { Button as HeroButton } from 'heroui-native/button';
import { useThemeColor } from 'heroui-native/hooks';
import { Spinner } from 'heroui-native/spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

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

const variantMap: Record<Variant, 'primary' | 'secondary' | 'ghost' | 'danger'> = {
  primary: 'primary',
  secondary: 'secondary',
  ghost: 'ghost',
  danger: 'danger',
};

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
    variant === 'primary' || variant === 'danger' ? 'accent-foreground' : 'accent',
  );

  return (
    <HeroButton
      variant={variantMap[variant]}
      isDisabled={isDisabled}
      onPress={onPress}
      style={style}
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