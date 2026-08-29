import { type ReactNode } from 'react';
import { View, type TextInputProps } from 'react-native';
import { Description } from 'heroui-native/description';
import { FieldError } from 'heroui-native/field-error';
import { Input } from 'heroui-native/input';
import { Label } from 'heroui-native/label';
import { TextField } from 'heroui-native/text-field';

type Props = TextInputProps & {
  readonly label: string;
  readonly error?: string;
  readonly hint?: string;
  readonly accessory?: ReactNode;
};

/**
 * HeroUI pins Label, Description and FieldError to `text-align: left` in
 * unlayered component CSS, on the assumption that a forced-RTL layout engine
 * resolves that to "start". This app hand-rolls RTL instead (see
 * src/i18n/rtl.ts), so left stays physically left on both platforms. The fix is
 * one rule at the bottom of global.css, not a prop at every call site.
 */
export function Field({ label, error, hint, accessory, style, accessibilityLabel, ...rest }: Props) {
  return (
    <TextField isInvalid={!!error}>
      <Label>{label}</Label>
      <View className="flex-row-reverse items-center">
        <Input
          textAlign="right"
          style={style}
          accessibilityLabel={accessibilityLabel ?? label}
          {...rest}
          className="flex-1"
        />
        {accessory ? <View className="ms-2">{accessory}</View> : null}
      </View>
      {error ? <FieldError>{error}</FieldError> : null}
      {!error && hint ? <Description>{hint}</Description> : null}
    </TextField>
  );
}