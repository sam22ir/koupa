import type { TranslationKey } from '@/src/i18n';

export const welcomeActions = [
  {
    labelKey: 'auth.createAccount',
    route: '/(auth)/role',
    variant: 'primary',
  },
  {
    labelKey: 'auth.existingAccount',
    route: '/(auth)/sign-in',
    variant: 'ghost',
  },
] as const satisfies readonly {
  readonly labelKey: TranslationKey;
  readonly route: '/(auth)/role' | '/(auth)/sign-in';
  readonly variant: 'primary' | 'ghost';
}[];
