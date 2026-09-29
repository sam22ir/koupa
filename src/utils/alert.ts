import { Alert as NativeAlert, Platform, type AlertButton } from 'react-native';

function webAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  const text = message ? `${title}\n\n${message}` : title;
  // One button (or none) is a notice; two or more is a question.
  const choices = buttons ?? [];
  if (choices.length < 2) {
    window.alert(text);
    choices[0]?.onPress?.();
    return;
  }
  const cancel = choices.find((button) => button.style === 'cancel');
  const confirm = choices.find((button) => button !== cancel) ?? choices[choices.length - 1];
  if (window.confirm(text)) confirm.onPress?.();
  else cancel?.onPress?.();
}

/**
 * Drop-in for React Native's `Alert`. `Alert.alert` does nothing on web, so
 * every confirm dialog (cancel appointment, block, leave shop, ...) looked
 * like a dead button in the browser. Native keeps the real system alert.
 */
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]): void {
    if (Platform.OS === 'web') {
      webAlert(title, message, buttons);
      return;
    }
    NativeAlert.alert(title, message, buttons);
  },
};
