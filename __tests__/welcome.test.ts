import { t } from '../src/i18n';
import { welcomeActions } from '../src/navigation/welcomeActions';

describe('welcome screen', () => {
  it('presents account creation as the primary path', () => {
    expect(welcomeActions).toEqual([
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
    ]);
  });

  it('uses the approved Arabic brand spelling and concise promise', () => {
    expect(t('auth.welcomeTitle')).toBe('أهلاً بك في كوپا');
    expect(t('auth.welcomeBody')).toBe('احجز موعد حلاقتك بسهولة، بدون انتظار.');
    expect(t('auth.existingAccount')).toBe('لدي حساب بالفعل');
  });
});
