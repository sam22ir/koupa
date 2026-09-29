import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Text } from 'react-native';

import ConfirmScreen from '../app/(auth)/confirm';
import FinishAccountScreen from '../app/(auth)/finish-account';
import ResetPasswordScreen from '../app/(auth)/reset-password';
import SessionErrorScreen from '../app/(auth)/session-error';
import SignInScreen from '../app/(auth)/sign-in';
import SignUpScreen from '../app/(auth)/sign-up';
import { AuthShell } from '../src/components/ui/AuthShell';
import { Button } from '../src/components/ui/Button';
import { Field } from '../src/components/ui/Field';
import { AppError } from '../src/services/errors';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

const mockRouter = router as unknown as {
  push: jest.Mock;
  replace: jest.Mock;
  dismissTo: jest.Mock;
};
const mockSearchParams = useLocalSearchParams as jest.Mock;

const mockSession = {
  loading: false,
  busy: false,
  pendingRole: 'customer' as 'customer' | 'barber' | null,
  profile: null as null | { role: 'customer' | 'barber' },
  signupConsent: true as boolean,
  setPendingRole: jest.fn(),
  confirmProfilelessRole: jest.fn(),
  signInWithGoogle: jest.fn(),
  linkGoogleIdentity: jest.fn(),
  signInWithPassword: jest.fn(),
  signInWithPhone: jest.fn(),
  signUpWithPassword: jest.fn(),
  resendEmailConfirmation: jest.fn(),
  signOut: jest.fn(),
  pendingConfirmationEmail: '',
  session: null as null | { user: { email?: string } },
  emailConfirmed: false,
  legalDocuments: [] as Array<{ key: 'terms' | 'privacy'; version: string; url: string }>,
  legalConsentRequired: false,
  legalError: null as string | null,
  acceptCurrentLegalDocuments: jest.fn(),
  retryLegalAcceptance: jest.fn(),
  retrySession: jest.fn(),
  bootstrapError: null as unknown,
  updatePassword: jest.fn(),
  refreshProfile: jest.fn(),
};

jest.mock('../src/providers/SessionProvider', () => ({
  useAppSession: () => mockSession,
}));

const mockGetSession = jest.fn();
const mockCreateCustomerProfile = jest.fn();

jest.mock('../src/services/auth', () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

jest.mock('../src/services/onboarding', () => ({
  createCustomerProfile: (...args: unknown[]) => mockCreateCustomerProfile(...args),
}));

const mockLoadLegalDocuments = jest.fn();

jest.mock('../src/services/legal', () => ({
  loadLegalDocuments: (...args: unknown[]) => mockLoadLegalDocuments(...args),
}));

describe('AuthShell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the auth stage and dismisses to welcome', async () => {
    await render(
      <AuthShell title="تسجيل الدخول" subtitle="ادخل إلى حسابك لإدارة مواعيدك.">
        <Text>form content</Text>
      </AuthShell>,
    );

    expect(screen.getByText('تسجيل الدخول')).toBeTruthy();
    expect(screen.getByText('ادخل إلى حسابك لإدارة مواعيدك.')).toBeTruthy();
    expect(screen.getByText('form content')).toBeTruthy();
    expect(screen.getByTestId('auth-shell-top-row')).toHaveStyle({
      flexDirection: 'row-reverse',
    });

    await fireEvent.press(screen.getByRole('button', { name: 'رجوع' }));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/(auth)/welcome');
  });

  it('exposes field accessories and disabled button state', async () => {
    await render(
      <>
        <Field label="كلمة المرور" accessory={<Text>عرض</Text>} />
        <Button label="متابعة" disabled />
      </>,
    );

    expect(screen.getByLabelText('كلمة المرور')).toBeTruthy();
    expect(screen.getByText('عرض')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'متابعة' })).toBeDisabled();
  });
});

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('offers email and phone sign-in methods', async () => {
    await render(<SignInScreen />);

    expect(screen.getByText('ادخل إلى حسابك لإدارة مواعيدك.')).toBeTruthy();
    expect(screen.getByLabelText('البريد الإلكتروني')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'هاتف' })).toBeTruthy();
  });

  it('signs in through the linked account when a phone number is selected', async () => {
    mockSession.signInWithPhone.mockResolvedValueOnce({
      user: { email: 'barber@example.com', email_confirmed_at: '2026-08-18T00:00:00.000Z' },
    });
    await render(<SignInScreen />);

    await fireEvent.press(screen.getByRole('tab', { name: 'هاتف' }));
    await fireEvent.changeText(screen.getByLabelText('رقم الهاتف'), '0555 000 000');
    await fireEvent.changeText(screen.getByLabelText('كلمة المرور'), 'secret123');
    await fireEvent.press(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    await waitFor(() => {
      expect(mockSession.signInWithPhone).toHaveBeenCalledWith('+213555000000', 'secret123');
      expect(mockRouter.replace).toHaveBeenCalledWith('/');
    });
  });

  it('reveals the password without changing its value', async () => {
    await render(<SignInScreen />);

    const password = screen.getByLabelText('كلمة المرور');
    await fireEvent.changeText(password, 'secret123');
    await fireEvent.press(screen.getByRole('button', { name: 'إظهار كلمة المرور' }));

    expect(screen.getByLabelText('كلمة المرور').props.secureTextEntry).toBe(false);
    expect(screen.getByDisplayValue('secret123')).toBeTruthy();
  });

  it('routes new users to account creation', async () => {
    await render(<SignInScreen />);

    await fireEvent.press(screen.getByText('إنشاء حساب'));
    expect(mockRouter.push).toHaveBeenCalledWith('/(auth)/welcome');
  });

  it('links Google only after an existing user proves ownership with a password', async () => {
    mockSession.signInWithGoogle.mockRejectedValueOnce(
      new AppError(
        'UNAUTHORIZED',
        new Error('Existing password sign-in is required before linking Google'),
      ),
    );
    mockSession.linkGoogleIdentity.mockResolvedValueOnce({ kind: 'session' });

    await render(<SignInScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'المتابعة مع Google' }));
    await screen.findByText('سجّل الدخول بكلمة المرور أولا قبل ربط Google.');

    await fireEvent.changeText(screen.getByLabelText('البريد الإلكتروني'), 'customer@example.com');
    await fireEvent.changeText(screen.getByLabelText('كلمة المرور'), 'secret123');
    await fireEvent.press(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    await waitFor(() => {
      expect(mockSession.signInWithPassword).toHaveBeenCalledWith(
        'customer@example.com',
        'secret123',
      );
      expect(mockSession.linkGoogleIdentity).toHaveBeenCalledTimes(1);
      expect(mockRouter.replace).toHaveBeenCalledWith('/');
    });
  });

  it('routes an unconfirmed email sign-in to confirmation instead of a dead-end error', async () => {
    mockSession.signInWithPassword.mockRejectedValueOnce(
      new AppError('UNAUTHORIZED', new Error('Email not confirmed')),
    );
    await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByLabelText('البريد الإلكتروني'), 'new@example.com');
    await fireEvent.changeText(screen.getByLabelText('كلمة المرور'), 'secret123');
    await fireEvent.press(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith({
        pathname: '/(auth)/confirm',
        params: { email: 'new@example.com' },
      });
    });
  });
});

describe('SignUpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.mockReturnValue({ role: 'customer' });
    mockSession.pendingRole = 'customer';
  });

  it('confirms the customer role in the shared sign-up form', async () => {
    await render(<SignUpScreen />);

    expect(screen.getByText('أنشئ حسابك ببريدك وأضف رقم هاتف للتواصل وابدأ حجز مواعيدك.')).toBeTruthy();
    // The role is confirmed in the header kicker, not as a decorative pill.
    expect(screen.getByText('زبون')).toBeTruthy();
  });

  it('confirms the barber role in the shared sign-up form', async () => {
    mockSearchParams.mockReturnValue({ role: 'barber' });
    mockSession.pendingRole = 'barber';
    await render(<SignUpScreen />);

    expect(screen.getByText('أنشئ حسابك ببريدك وأضف رقم هاتف للتواصل وابدأ تجهيز ملفك المهني.')).toBeTruthy();
    expect(screen.getByText('حلاق')).toBeTruthy();
    expect(screen.queryByLabelText('اسم المحل')).toBeNull();
  });

  it('returns a direct signup URL to welcome when no signup intent exists', async () => {
    mockSearchParams.mockReturnValue({});
    mockSession.pendingRole = null;
    await render(<SignUpScreen />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/welcome');
    });
  });

  it('requires a contact phone alongside the account email', async () => {
    await render(<SignUpScreen />);

    expect(screen.getByLabelText('رقم الهاتف للتواصل')).toBeTruthy();
    expect(screen.getByLabelText('البريد الإلكتروني')).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'هاتف' })).toBeNull();

    const password = screen.getByLabelText('كلمة المرور');
    await fireEvent.changeText(password, 'secret123');
    await fireEvent.press(screen.getByRole('button', { name: 'إظهار كلمة المرور' }));

    expect(screen.getByLabelText('كلمة المرور').props.secureTextEntry).toBe(false);
    expect(screen.getByDisplayValue('secret123')).toBeTruthy();
  });

  it('creates a customer account and profile from one form', async () => {
    mockSession.signUpWithPassword.mockResolvedValueOnce('signup');
    mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockCreateCustomerProfile.mockResolvedValueOnce(undefined);
    await render(<SignUpScreen />);

    await fireEvent.changeText(screen.getByLabelText('الاسم'), 'سارة');
    await fireEvent.changeText(screen.getByLabelText('البريد الإلكتروني'), 'customer@example.com');
    await fireEvent.changeText(screen.getByLabelText('رقم الهاتف للتواصل'), '0555123456');
    await fireEvent.changeText(screen.getByLabelText('كلمة المرور'), 'secret123');
    await fireEvent.press(screen.getByRole('button', { name: 'إنشاء حساب' }));

    await waitFor(() => {
      expect(mockSession.signUpWithPassword).toHaveBeenCalledWith({
        email: 'customer@example.com',
        name: 'سارة',
        phone: '+213555123456',
        password: 'secret123',
        role: 'customer',
      });
      expect(mockCreateCustomerProfile).toHaveBeenCalledWith('user-1', 'سارة', '+213555123456');
      expect(mockSession.refreshProfile).toHaveBeenCalledWith('user-1');
      expect(mockRouter.replace).toHaveBeenCalledWith('/');
    });
  });

  it('needs no consent checkbox, only a notice with the legal links', async () => {
    await render(<SignUpScreen />);

    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByText('الشروط')).toBeTruthy();
    expect(screen.getByText('الخصوصية')).toBeTruthy();
  });

  it('requires a name for customers', async () => {
    await render(<SignUpScreen />);

    await fireEvent.changeText(screen.getByLabelText('البريد الإلكتروني'), 'customer@example.com');
    await fireEvent.changeText(screen.getByLabelText('رقم الهاتف للتواصل'), '0555123456');
    await fireEvent.changeText(screen.getByLabelText('كلمة المرور'), 'secret123');
    await fireEvent.press(screen.getByRole('button', { name: 'إنشاء حساب' }));

    expect(await screen.findByText('أدخل اسمك.')).toBeTruthy();
    expect(mockSession.signUpWithPassword).not.toHaveBeenCalled();
  });

  it('falls back to customer setup when profile creation fails after signup', async () => {
    mockSession.signUpWithPassword.mockResolvedValueOnce('signup');
    mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockCreateCustomerProfile.mockRejectedValueOnce(new Error('network'));
    await render(<SignUpScreen />);

    await fireEvent.changeText(screen.getByLabelText('الاسم'), 'سارة');
    await fireEvent.changeText(screen.getByLabelText('البريد الإلكتروني'), 'customer@example.com');
    await fireEvent.changeText(screen.getByLabelText('رقم الهاتف للتواصل'), '0555123456');
    await fireEvent.changeText(screen.getByLabelText('كلمة المرور'), 'secret123');
    await fireEvent.press(screen.getByRole('button', { name: 'إنشاء حساب' }));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockSession.refreshProfile).not.toHaveBeenCalled();
  });

  it('asks a barber for their name at signup but creates no customer profile', async () => {
    mockSearchParams.mockReturnValue({ role: 'barber' });
    mockSession.pendingRole = 'barber';
    mockSession.signUpWithPassword.mockResolvedValueOnce('signup');
    await render(<SignUpScreen />);

    await fireEvent.changeText(screen.getByLabelText('الاسم'), 'سمير');
    await fireEvent.changeText(screen.getByLabelText('البريد الإلكتروني'), 'barber@example.com');
    await fireEvent.changeText(screen.getByLabelText('رقم الهاتف للتواصل'), '0555123456');
    await fireEvent.changeText(screen.getByLabelText('كلمة المرور'), 'secret123');
    await fireEvent.press(screen.getByRole('button', { name: 'إنشاء حساب' }));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockSession.signUpWithPassword).toHaveBeenCalledWith({
      email: 'barber@example.com',
      name: 'سمير',
      phone: '+213555123456',
      password: 'secret123',
      role: 'barber',
    });
    expect(mockCreateCustomerProfile).not.toHaveBeenCalled();
  });

  it('offers Google first without a consent step', async () => {
    mockSession.signInWithGoogle.mockResolvedValueOnce({ kind: 'session' });
    await render(<SignUpScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'المتابعة مع Google' }));

    await waitFor(() => {
      expect(mockSession.signInWithGoogle).toHaveBeenCalledWith('customer');
      expect(mockRouter.replace).toHaveBeenCalledWith('/');
    });
  });

  it('routes existing users to sign in', async () => {
    await render(<SignUpScreen />);

    await fireEvent.press(screen.getByText('تسجيل الدخول'));
    expect(mockRouter.push).toHaveBeenCalledWith('/(auth)/sign-in');
  });

  it('returns directly to welcome from role-specific sign up', async () => {
    await render(<SignUpScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'رجوع' }));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/(auth)/welcome');
  });
});

describe('FinishAccountScreen (role and consent missing)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.pendingRole = null;
    mockSession.legalDocuments = [
      { key: 'terms', version: '2026-07-29', url: 'https://example.test/terms' },
      { key: 'privacy', version: '2026-07-29', url: 'https://example.test/privacy' },
    ];
  });

  it('requires a role and explicit legal consent before completing a profileless account', async () => {
    mockSession.acceptCurrentLegalDocuments.mockResolvedValueOnce(undefined);
    mockSession.confirmProfilelessRole.mockResolvedValueOnce(undefined);
    await render(<FinishAccountScreen />);

    const continueButton = screen.getByRole('button', { name: 'حفظ ومتابعة' });
    expect(continueButton.props.accessibilityState?.disabled).toBe(true);

    await fireEvent.press(screen.getByRole('radio', { name: /زبون/ }));
    expect(continueButton.props.accessibilityState?.disabled).toBe(true);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'أوافق على الشروط والأحكام وسياسة الخصوصية الخاصة بتطبيق كوپا.' }));
    await fireEvent.press(continueButton);

    await waitFor(() => {
      expect(mockSession.acceptCurrentLegalDocuments).toHaveBeenCalledTimes(1);
      expect(mockSession.confirmProfilelessRole).toHaveBeenCalledWith('customer');
      expect(mockRouter.replace).toHaveBeenCalledWith('/');
    });
  });
});

describe('FinishAccountScreen with a role already chosen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.pendingRole = 'barber';
    mockSession.signupConsent = false;
    mockSession.legalDocuments = [
      { key: 'terms', version: '2026-07-29', url: 'https://example.test/terms' },
      { key: 'privacy', version: '2026-07-29', url: 'https://example.test/privacy' },
    ];
  });

  afterEach(() => {
    mockSession.pendingRole = null;
    mockSession.signupConsent = true;
  });

  it('does not ask for the role again and keeps the chosen one', async () => {
    mockSession.acceptCurrentLegalDocuments.mockResolvedValueOnce(undefined);
    mockSession.confirmProfilelessRole.mockResolvedValueOnce(undefined);
    await render(<FinishAccountScreen />);

    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.getByText(/نوع الحساب/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('checkbox', {
      name: 'أوافق على الشروط والأحكام وسياسة الخصوصية الخاصة بتطبيق كوپا.',
    }));
    await fireEvent.press(screen.getByRole('button', { name: 'حفظ ومتابعة' }));

    await waitFor(() => {
      expect(mockSession.confirmProfilelessRole).toHaveBeenCalledWith('barber');
    });
  });
});

describe('FinishAccountScreen (role and consent missing)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.pendingRole = null;
    mockSession.legalDocuments = [
      { key: 'terms', version: '2026-07-29', url: 'https://example.test/terms' },
      { key: 'privacy', version: '2026-07-29', url: 'https://example.test/privacy' },
    ];
  });

  it('requires an explicit role and consent before continuing', async () => {
    await render(<FinishAccountScreen />);

    const continueButton = screen.getByRole('button', { name: 'حفظ ومتابعة' });
    await fireEvent.press(continueButton);
    expect(mockSession.acceptCurrentLegalDocuments).not.toHaveBeenCalled();
    expect(mockSession.confirmProfilelessRole).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('radio', { name: /زبون/ }));
    await fireEvent.press(continueButton);
    expect(mockSession.acceptCurrentLegalDocuments).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('checkbox', {
      name: 'أوافق على الشروط والأحكام وسياسة الخصوصية الخاصة بتطبيق كوپا.',
    }));
    await fireEvent.press(continueButton);

    await waitFor(() => {
      expect(mockSession.acceptCurrentLegalDocuments).toHaveBeenCalledTimes(1);
      expect(mockSession.confirmProfilelessRole).toHaveBeenCalledWith('customer');
      expect(mockRouter.replace).toHaveBeenCalledWith('/');
    });
  });
});

describe('ConfirmScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.pendingConfirmationEmail = 'stale@example.com';
    mockSession.session = { user: { email: 'account@example.com' } };
    mockSession.emailConfirmed = false;
  });

  it('uses the authenticated account email as a read-only resend destination', async () => {
    await render(<ConfirmScreen />);

    const email = screen.getByLabelText('البريد الإلكتروني');
    expect(email).toHaveDisplayValue('account@example.com');
    expect(email.props.editable).toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: 'إعادة إرسال الرابط' }));
    await waitFor(() => {
      expect(mockSession.resendEmailConfirmation).toHaveBeenCalledWith('account@example.com');
    });
  });

  it('signs out before switching to sign in', async () => {
    mockSession.signOut.mockResolvedValueOnce(undefined);
    await render(<ConfirmScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    await waitFor(() => expect(mockSession.signOut).toHaveBeenCalledTimes(1));
    expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/sign-in');
  });

  it('keeps confirmation visible when account switching fails', async () => {
    mockSession.signOut.mockRejectedValueOnce(new Error('Network request failed'));
    await render(<ConfirmScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    expect(await screen.findByText('تحقق من الاتصال بالإنترنت')).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalledWith('/(auth)/sign-in');
  });
});

describe('SessionErrorScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.bootstrapError = new Error('Network request failed');
  });

  afterEach(() => {
    mockSession.bootstrapError = null;
  });

  it('does not show an impossible Back control', async () => {
    await render(<SessionErrorScreen />);

    expect(screen.queryByRole('button', { name: 'رجوع' })).toBeNull();
  });
});

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.session = { user: { email: 'account@example.com' } };
  });

  it('keeps recovery visible when switching to sign in fails', async () => {
    mockSession.signOut.mockRejectedValueOnce(new Error('Network request failed'));
    await render(<ResetPasswordScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    expect(await screen.findByText('تحقق من الاتصال بالإنترنت')).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalledWith('/(auth)/sign-in');
  });
});

describe('FinishAccountScreen when saving consent failed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.pendingRole = 'customer';
    mockSession.profile = null;
    mockSession.signupConsent = true;
    mockSession.legalConsentRequired = false;
    mockSession.legalError = 'LEGAL_SAVE_FAILED';
    mockSession.legalDocuments = [
      { key: 'terms', version: '1', url: 'https://example.test/terms' },
      { key: 'privacy', version: '1', url: 'https://example.test/privacy' },
    ];
    mockSession.acceptCurrentLegalDocuments.mockResolvedValue(undefined);
    mockSession.signOut.mockResolvedValue(undefined);
  });

  afterEach(() => {
    mockSession.legalError = null;
    mockSession.pendingRole = null;
  });

  it('offers only a retry and account switching, without asking for anything again', async () => {
    await render(<FinishAccountScreen />);

    expect(screen.getByText('تعذر إكمال الموافقة القانونية')).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    await waitFor(() => expect(mockSession.acceptCurrentLegalDocuments).toHaveBeenCalledTimes(1));
    // Role and consent are already stamped; only the legal save is retried.
    expect(mockSession.confirmProfilelessRole).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/');

    await fireEvent.press(screen.getByRole('button', { name: 'تغيير الحساب' }));
    await waitFor(() => expect(mockSession.signOut).toHaveBeenCalledTimes(1));
  });
});

describe('FinishAccountScreen when the terms were updated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.pendingRole = 'customer';
    mockSession.profile = { role: 'customer' };
    mockSession.signupConsent = true;
    mockSession.legalConsentRequired = true;
    mockSession.legalError = null;
    mockSession.legalDocuments = [
      { key: 'terms', version: '2026-07-29', url: 'https://example.test/terms' },
      { key: 'privacy', version: '2026-07-29', url: 'https://example.test/privacy' },
    ];
    mockSession.acceptCurrentLegalDocuments.mockResolvedValue(undefined);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockSession.profile = null;
    mockSession.legalConsentRequired = false;
    mockSession.pendingRole = null;
  });

  it('requires explicit acceptance, never asks for a role, and only saves the acceptance', async () => {
    await render(<FinishAccountScreen />);

    expect(screen.getByText('مراجعة الشروط والخصوصية')).toBeTruthy();
    expect(screen.queryByRole('radio')).toBeNull();
    const save = screen.getByRole('button', { name: 'حفظ ومتابعة' });
    expect(save).toBeDisabled();

    await fireEvent.press(screen.getByRole('link', { name: 'الشروط' }));
    expect(Linking.openURL).toHaveBeenCalledWith('https://koupa-website.pages.dev/terms/');

    await fireEvent.press(screen.getByRole('checkbox', {
      name: 'أوافق على الشروط والأحكام وسياسة الخصوصية الخاصة بتطبيق كوپا.',
    }));
    expect(save).toBeEnabled();
    await fireEvent.press(save);

    await waitFor(() => expect(mockSession.acceptCurrentLegalDocuments).toHaveBeenCalledTimes(1));
    expect(mockSession.confirmProfilelessRole).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('keeps the screen visible when account switching fails', async () => {
    mockSession.signOut.mockRejectedValueOnce(new Error('Network request failed'));
    await render(<FinishAccountScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'تغيير الحساب' }));

    expect(await screen.findByText('تحقق من الاتصال بالإنترنت')).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalledWith('/(auth)/welcome');
  });
});

describe('FinishAccountScreen with consent missing but a role chosen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.pendingRole = 'barber';
    mockSession.profile = null;
    mockSession.signupConsent = false;
    mockSession.legalConsentRequired = false;
    mockSession.legalDocuments = [
      { key: 'terms', version: '1', url: 'https://example.test/terms' },
      { key: 'privacy', version: '1', url: 'https://example.test/privacy' },
    ];
    mockSession.acceptCurrentLegalDocuments.mockResolvedValue(undefined);
    mockSession.confirmProfilelessRole.mockResolvedValue(undefined);
  });

  afterEach(() => {
    mockSession.signupConsent = true;
    mockSession.pendingRole = null;
  });

  it('stamps the already chosen role together with the consent', async () => {
    await render(<FinishAccountScreen />);

    expect(screen.queryByRole('radio')).toBeNull();
    await fireEvent.press(screen.getByRole('checkbox', {
      name: 'أوافق على الشروط والأحكام وسياسة الخصوصية الخاصة بتطبيق كوپا.',
    }));
    await fireEvent.press(screen.getByRole('button', { name: 'حفظ ومتابعة' }));

    await waitFor(() => expect(mockSession.confirmProfilelessRole).toHaveBeenCalledWith('barber'));
  });
});
