import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import BarberProfileScreen from '../app/(barber)/profile';
import CustomerProfileScreen from '../app/(customer)/profile';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
}));

const mockSession = {
  profile: { id: 'user-1', role: 'customer', name: 'Amine', phone: '+213555000000', is_published: true },
  signOut: jest.fn(async () => undefined),
  legalDocuments: [
    { key: 'terms', version: '2026-07-29', url: 'https://example.test/terms' },
    { key: 'privacy', version: '2026-07-29', url: 'https://example.test/privacy' },
  ],
};

jest.mock('../src/providers/SessionProvider', () => ({ useAppSession: () => mockSession }));
jest.mock('../src/hooks/useAccountLifecycle', () => ({
  useAccountLifecycle: () => ({ loading: false, error: null, deleteAccount: jest.fn(async () => true) }),
}));
jest.mock('../src/services/profile', () => ({
  updateProfileName: jest.fn(async () => undefined),
}));

describe.each([
  ['customer', CustomerProfileScreen],
  ['barber', BarberProfileScreen],
] as const)('%s profile legal links', (_role, ProfileScreen) => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens terms, privacy, deletion information, and the approved support email', async () => {
    await render(<ProfileScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'الشروط' }));
    await fireEvent.press(screen.getByRole('button', { name: 'سياسة الخصوصية' }));
    await fireEvent.press(screen.getByRole('button', { name: 'معلومات حذف الحساب' }));
    await fireEvent.press(screen.getByRole('button', { name: 'مراسلة الدعم' }));

    expect(Linking.openURL).toHaveBeenNthCalledWith(1, 'https://koupa-website.pages.dev/terms/');
    expect(Linking.openURL).toHaveBeenNthCalledWith(2, 'https://koupa-website.pages.dev/privacy/');
    expect(Linking.openURL).toHaveBeenNthCalledWith(3, 'https://koupa-website.pages.dev/account-deletion/');
    expect(Linking.openURL).toHaveBeenNthCalledWith(4, 'mailto:saadisamir20200@gmail.com');
  });
});
