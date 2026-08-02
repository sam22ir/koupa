import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Text } from 'react-native';

import RoleScreen from '../app/(auth)/role';
import ConfirmScreen from '../app/(auth)/confirm';
import LegalErrorScreen from '../app/(auth)/legal-error';
import LegalConsentScreen from '../app/(auth)/legal-consent';
import SignInScreen from '../app/(auth)/sign-in';
import SignUpScreen from '../app/(auth)/sign-up';
import { AuthShell } from '../src/components/ui/AuthShell';
import { Button } from '../src/components/ui/Button';
import { Field } from '../src/components/ui/Field';
import { AppError } from '../src/services/errors';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
}));

const mockRouter = router as unknown as {
  push: jest.Mock;
  replace: jest.Mock;
};
const mockSearchParams = useLocalSearchParams as jest.Mock;

const mockSession = {
  loading: false,
  busy: false,
  pendingRole: 'customer' as 'customer' | 'barber' | null,
  setPendingRole: jest.fn(),
  signInWithGoogle: jest.fn(),
  linkGoogleIdentity: jest.fn(),
  signInWithPassword: jest.fn(),
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
};

jest.mock('../src/providers/SessionProvider', () => ({
  useAppSession: () => mockSession,
}));

const mockLoadLegalDocuments = jest.fn();

jest.mock('../src/services/legal', () => ({
  loadLegalDocuments: (...args: unknown[]) => mockLoadLegalDocuments(...args),
}));

describe('AuthShell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the auth stage and returns to welcome', async () => {
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
    expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/welcome');
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

  it('switches from email to phone credentials', async () => {
    await render(<SignInScreen />);

    expect(screen.getByText('ادخل إلى حسابك لإدارة مواعيدك.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'هاتف' }));
    expect(screen.getByLabelText('رقم الهاتف')).toBeTruthy();
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
    expect(mockRouter.push).toHaveBeenCalledWith('/(auth)/role');
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
        'email',
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

describe('RoleScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadLegalDocuments.mockResolvedValue([
      { key: 'terms', version: '1', url: 'https://example.test/terms' },
      { key: 'privacy', version: '1', url: 'https://example.test/privacy' },
    ]);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('gates continuation on role selection and legal consent', async () => {
    await render(<RoleScreen />);
    await screen.findByRole('radio', { name: 'زبون' });

    expect(screen.getByText('اختيارك دائم ولا يمكن تغييره لاحقاً.')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'زبون' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'متابعة' })).toBeDisabled();

    await fireEvent.press(screen.getByRole('radio', { name: 'حلاق' }));
    expect(screen.getByRole('radio', { name: 'حلاق' })).toBeSelected();

    await fireEvent.press(
      screen.getByRole('checkbox', { name: 'أوافق على الشروط وسياسة الخصوصية' }),
    );
    expect(screen.getByRole('button', { name: 'متابعة' })).toBeEnabled();
  });

  it('opens legal links without toggling consent', async () => {
    await render(<RoleScreen />);
    await screen.findByRole('radio', { name: 'زبون' });

    const consent = screen.getByRole('checkbox', {
      name: 'أوافق على الشروط وسياسة الخصوصية',
    });
    expect(consent).not.toBeChecked();

    await fireEvent.press(screen.getByRole('link', { name: 'الشروط' }));

    expect(Linking.openURL).toHaveBeenCalledWith('https://koupa-website.pages.dev/terms/');
    expect(consent).not.toBeChecked();
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

    expect(screen.getByText('أنشئ حسابك وابدأ حجز مواعيدك.')).toBeTruthy();
    expect(screen.getByText('زبون')).toBeTruthy();
    expect(screen.getByTestId('sign-up-role-badge')).toHaveStyle({
      alignSelf: 'flex-start',
    });
  });

  it('confirms the barber role in the shared sign-up form', async () => {
    mockSearchParams.mockReturnValue({ role: 'barber' });
    mockSession.pendingRole = 'barber';
    await render(<SignUpScreen />);

    expect(screen.getByText('أنشئ حسابك وابدأ تجهيز ملفك المهني.')).toBeTruthy();
    expect(screen.getByText('حلاق')).toBeTruthy();
  });

  it('returns a direct signup URL to role selection when no signup intent exists', async () => {
    mockSearchParams.mockReturnValue({});
    mockSession.pendingRole = null;
    await render(<SignUpScreen />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/role');
    });
  });

  it('shows phone recovery fields and preserves a revealed password', async () => {
    await render(<SignUpScreen />);

    await fireEvent.press(screen.getByRole('tab', { name: 'هاتف' }));
    expect(screen.getByLabelText('رقم الهاتف')).toBeTruthy();
    expect(screen.getByLabelText('بريد الاستعادة')).toBeTruthy();

    const password = screen.getByLabelText('كلمة المرور');
    await fireEvent.changeText(password, 'secret123');
    await fireEvent.press(screen.getByRole('button', { name: 'إظهار كلمة المرور' }));

    expect(screen.getByLabelText('كلمة المرور').props.secureTextEntry).toBe(false);
    expect(screen.getByDisplayValue('secret123')).toBeTruthy();
  });

  it('routes existing users to sign in', async () => {
    await render(<SignUpScreen />);

    await fireEvent.press(screen.getByText('تسجيل الدخول'));
    expect(mockRouter.push).toHaveBeenCalledWith('/(auth)/sign-in');
  });

  it('returns to role selection from role-specific sign up', async () => {
    await render(<SignUpScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'رجوع' }));
    expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/role');
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
});

describe('LegalErrorScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.legalError = 'LEGAL_SAVE_FAILED';
    mockSession.legalDocuments = [
      { key: 'terms', version: '1', url: 'https://example.test/terms' },
      { key: 'privacy', version: '1', url: 'https://example.test/privacy' },
    ];
    mockSession.retryLegalAcceptance.mockResolvedValue(undefined);
    mockSession.signOut.mockResolvedValue(undefined);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('offers legal links, retry, and account switching', async () => {
    await render(<LegalErrorScreen />);

    expect(screen.getByText('تعذر إكمال الموافقة القانونية')).toBeTruthy();
    await fireEvent.press(screen.getByRole('link', { name: 'الشروط' }));
    expect(Linking.openURL).toHaveBeenCalledWith('https://koupa-website.pages.dev/terms/');

    await fireEvent.press(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    await waitFor(() => expect(mockSession.retryLegalAcceptance).toHaveBeenCalledTimes(1));

    await fireEvent.press(screen.getByRole('button', { name: 'تغيير الحساب' }));
    await waitFor(() => expect(mockSession.signOut).toHaveBeenCalledTimes(1));
  });
});

describe('LegalConsentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.legalDocuments = [
      { key: 'terms', version: '2026-07-29', url: 'https://example.test/terms' },
      { key: 'privacy', version: '2026-07-29', url: 'https://example.test/privacy' },
    ];
    mockSession.acceptCurrentLegalDocuments.mockResolvedValue(undefined);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requires explicit acceptance before saving the current versions', async () => {
    await render(<LegalConsentScreen />);

    expect(screen.getByText('مراجعة الشروط والخصوصية')).toBeTruthy();
    const save = screen.getByRole('button', { name: 'حفظ الموافقة' });
    expect(save).toBeDisabled();

    await fireEvent.press(screen.getByRole('link', { name: 'الشروط' }));
    expect(Linking.openURL).toHaveBeenCalledWith('https://koupa-website.pages.dev/terms/');

    await fireEvent.press(screen.getByRole('checkbox', { name: 'أوافق على الشروط وسياسة الخصوصية' }));
    expect(save).toBeEnabled();
    await fireEvent.press(save);

    await waitFor(() => expect(mockSession.acceptCurrentLegalDocuments).toHaveBeenCalledTimes(1));
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });
});
