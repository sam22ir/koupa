import { Platform } from 'react-native';

let bootstrapped = false;

/**
 * Arabic language bootstrap.
 *
 * Native RTL state is configuration-time state. Mutating it while Expo Go is
 * starting can restart the host immediately after the first bundle loads.
 *
 * Every screen already draws its own RTL — `flexDirection: 'row-reverse'`,
 * `alignSelf: 'flex-end'`, `textAlign: 'right'` — against an LTR layout engine.
 * Setting `dir="rtl"` on the document made react-native-web flip those same
 * styles a second time, so content meant for the leading (right) edge landed on
 * the left. Web therefore only gets the language tag; direction stays with the
 * styles, exactly like native.
 */
export function bootstrapRtl(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', 'ar');
  }
}
