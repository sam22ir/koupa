import { fireEvent, render, screen } from '@testing-library/react-native';

import CustomerProfileScreen from '../app/(customer)/profile';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockUpdateProfileName = jest.fn();
const mockRefreshProfile = jest.fn(async () => undefined);
const mockSignOut = jest.fn(async () => undefined);
const mockDeleteAccount = jest.fn(async () => true);

const mockSession = {
  session: { user: { id: 'user-1', phone: '0555000001' } },
  profile: {
    id: 'user-1',
    role: 'customer' as const,
    name: 'ليلى بن عمر',
    phone: '0555000001',
    is_published: false,
  },
  refreshProfile: mockRefreshProfile,
  signOut: mockSignOut,
  legalDocuments: [
    { key: 'terms', version: '2026-07-29', url: 'https://example.test/terms' },
    { key: 'privacy', version: '2026-07-29', url: 'https://example.test/privacy' },
  ],
};

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
}));
jest.mock('@/src/providers/SessionProvider', () => ({ useAppSession: () => mockSession }));
jest.mock('@/src/hooks/useAccountLifecycle', () => ({
  useAccountLifecycle: () => ({ loading: false, error: null, deleteAccount: mockDeleteAccount }),
}));
jest.mock('@/src/services/profile', () => ({
  updateProfileName: (...args: unknown[]) => mockUpdateProfileName(...args),
}));

describe('customer profile screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateProfileName.mockResolvedValue(undefined);
  });

  it('shows the read-only identity card and opens the inline editor', async () => {
    await render(<CustomerProfileScreen />);

    expect(screen.getByRole('button', { name: 'تعديل الملف الشخصي' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'تعديل الملف الشخصي' }));

    expect(screen.getByDisplayValue('ليلى بن عمر')).toBeTruthy();
    expect(screen.getByDisplayValue('0555000001')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'حفظ التغييرات' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'إلغاء' })).toBeTruthy();
  });

  it('cancels the edit and rejects an empty name without saving', async () => {
    await render(<CustomerProfileScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'تعديل الملف الشخصي' }));
    await fireEvent.changeText(screen.getByDisplayValue('ليلى بن عمر'), '   ');
    await fireEvent.press(screen.getByRole('button', { name: 'حفظ التغييرات' }));

    expect(screen.getByText('أدخل اسما صالحا')).toBeTruthy();
    expect(mockUpdateProfileName).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'إلغاء' }));
    expect(screen.getByText('ليلى بن عمر')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'حفظ التغييرات' })).toBeNull();
  });

  it('saves the trimmed name, refreshes the session, and returns to read-only mode', async () => {
    await render(<CustomerProfileScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'تعديل الملف الشخصي' }));
    await fireEvent.changeText(screen.getByDisplayValue('ليلى بن عمر'), '  ليلى الجديدة  ');
    await fireEvent.press(screen.getByRole('button', { name: 'حفظ التغييرات' }));

    expect(mockUpdateProfileName).toHaveBeenCalledWith('user-1', 'ليلى الجديدة');
    expect(mockRefreshProfile).toHaveBeenCalledTimes(1);
    expect(screen.getByText('تم حفظ التغييرات')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'تعديل الملف الشخصي' })).toBeTruthy();
  });

  it('keeps the editor open and shows an inline error when saving fails', async () => {
    mockUpdateProfileName.mockRejectedValue(new Error('save failed'));
    await render(<CustomerProfileScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'تعديل الملف الشخصي' }));
    await fireEvent.changeText(screen.getByDisplayValue('ليلى بن عمر'), 'ليلى الجديدة');
    await fireEvent.press(screen.getByRole('button', { name: 'حفظ التغييرات' }));

    expect(screen.getByText('تعذّر تنفيذ هذه العملية. تحقق من البيانات أو الاتصال ثم حاول مرة أخرى.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'حفظ التغييرات' })).toBeTruthy();
    expect(screen.getByDisplayValue('ليلى الجديدة')).toBeTruthy();
  });

  it('renders grouped actions and keeps the expanded page scrollable', async () => {
    const view = await render(<CustomerProfileScreen />);

    expect(screen.getByText('الحساب')).toBeTruthy();
    expect(screen.getByText('المساعدة والخصوصية')).toBeTruthy();
    expect(screen.getByText('الجلسة')).toBeTruthy();
    expect(screen.getByText('منطقة حساسة')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'الإشعارات' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'تسجيل الخروج' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'حذف الحساب' })).toBeTruthy();

    const root = view.root;
    if (!root) throw new Error('Profile root was not rendered');
    expect(String(root.type)).toContain('ScrollView');
    expect(root.props.scrollEnabled).toBe(true);
  });
});
