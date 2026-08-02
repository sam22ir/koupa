import { Platform } from 'react-native';

let bootstrapped = false;

/**
 * Arabic layout bootstrap.
 *
 * Native RTL state is configuration-time state. Mutating it while Expo Go is
 * starting can restart the host immediately after the first bundle loads.
 *
 * Native screens use style-level RTL (row-reverse / textAlign right). Only web
 * needs a runtime document direction update.
 * Web sets document dir=rtl.
 */
export function bootstrapRtl(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.setAttribute('lang', 'ar');
    document.body?.style.setProperty('direction', 'rtl');
  }
}
