import { fireEvent, render, screen } from '@testing-library/react-native';

import ShopActivityScreen from '@/app/(barber)/shop-activity/[id]';

const mockGetActivity = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'shop-1' }),
  router: { dismissTo: jest.fn(), replace: (...args: unknown[]) => mockReplace(...args) },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

jest.mock('@/src/providers/SessionProvider', () => ({
  useAppSession: () => ({ session: { user: { id: 'owner-1' } } }),
}));

jest.mock('@/src/hooks/useShops', () => ({
  useShops: () => ({ error: '', getActivity: mockGetActivity }),
}));

const now = Date.now();

const items = [
  {
    id: 'activity-1',
    action: 'barber_settings_updated',
    actorName: 'سمير',
    affectedBarberName: 'عمر',
    createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'activity-2',
    action: 'member_joined',
    actorName: 'سمير',
    affectedBarberName: 'ياسين',
    createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

describe('ShopActivityScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActivity.mockResolvedValue(items);
  });

  it('shows summary metrics, the latest event, and recent activity', async () => {
    await render(<ShopActivityScreen />);

    expect(await screen.findByTestId('activity-summary')).toBeTruthy();
    expect(screen.getByLabelText('إجمالي الأحداث، 2')).toBeTruthy();
    expect(screen.getByLabelText('هذا الأسبوع، 2')).toBeTruthy();
    expect(screen.getByText('آخر تحديث')).toBeTruthy();
    expect(screen.getByText('تحديث إعدادات الحلاق')).toBeTruthy();
    expect(screen.getByText('آخر الأحداث')).toBeTruthy();
  });

  it('shows a designed empty state when no activity exists', async () => {
    mockGetActivity.mockResolvedValue([]);
    await render(<ShopActivityScreen />);

    expect(await screen.findByTestId('activity-empty')).toBeTruthy();
    expect(screen.getByText('لا يوجد نشاط بعد')).toBeTruthy();
    expect(screen.queryByTestId('activity-summary')).toBeNull();
  });

  it('returns to the barber shop when the header back button is pressed', async () => {
    await render(<ShopActivityScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'رجوع' }));

    expect(mockReplace).toHaveBeenCalledWith('/shop');
  });
});
