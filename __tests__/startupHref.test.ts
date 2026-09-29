import {
  clearPendingIntent,
  consumePendingIntent,
  getPendingIntent,
  setPendingIntentFromPath,
} from '@/src/navigation/pendingIntent';
import { resolveStartupHref } from '@/src/navigation/resolveStartupHref';

describe('startup screen choice', () => {
  beforeEach(() => {
    clearPendingIntent();
  });

  it('sends every signed-out launch to the single welcome screen', () => {
    expect(resolveStartupHref('auth')).toBe('/(auth)/welcome');
  });

  it('sends a browsing guest to the customer home', () => {
    expect(resolveStartupHref('guest')).toBe('/(customer)/home');
  });

  it('leaves confirmation and signed-in destinations unchanged', () => {
    expect(resolveStartupHref('confirm')).toBe('/(auth)/confirm');
    expect(resolveStartupHref('customer')).toBe('/(customer)/home');
    expect(resolveStartupHref('loading')).toBeNull();
  });

  it('keeps a deep link pending until the matching workspace opens', () => {
    setPendingIntentFromPath('/book/barber-1', { serviceId: 'cut' });

    expect(consumePendingIntent('auth')).toBeNull();
    expect(consumePendingIntent('guest')).toBeNull();
    expect(getPendingIntent()).toBe('/book/barber-1?serviceId=cut');
    expect(consumePendingIntent('customer')).toBe('/book/barber-1?serviceId=cut');
  });
});
