import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import ShopCreateScreen from '@/app/(barber)/shop-create';
import ShopSearchScreen from '@/app/(barber)/shop-search';
import type { ShopSummary } from '@/src/shops';

const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: mockRouterPush, replace: mockRouterReplace, back: jest.fn(), dismissTo: jest.fn() },
  useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace, back: jest.fn(), dismissTo: jest.fn() }),
  useLocalSearchParams: jest.fn(() => ({})),
}));

const mockSearchShops = jest.fn();
const mockSearchBarbers = jest.fn();
const mockRequestJoin = jest.fn();
const mockInviteBarber = jest.fn();
const mockCreateShop = jest.fn();
let mockShopError = '';

jest.mock('@/src/hooks/useShops', () => ({
  useShops: () => ({
    searchShops: mockSearchShops,
    searchBarbers: mockSearchBarbers,
    requestJoin: mockRequestJoin,
    inviteBarber: mockInviteBarber,
    createShop: mockCreateShop,
    ownedShop: { id: 'shop-1' },
    saving: false,
    loading: false,
    get error() {
      return mockShopError;
    },
  }),
}));

jest.mock('@/src/providers/SessionProvider', () => ({
  useAppSession: () => ({ session: { user: { id: 'barber-1' } } }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

const shop: ShopSummary = {
  id: 'shop-1',
  name: 'Central Barber',
  bio: 'حلاقة رجالية',
  maps_url: null,
  city: 'الجزائر',
  neighborhood: 'حيدرة',
  average_rating: 4.5,
  rating_count: 12,
  owner_name: 'سمير',
};

describe('barber Shop discovery workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShopError = '';
    mockSearchShops.mockResolvedValue([shop]);
    mockSearchBarbers.mockResolvedValue([{ id: 'barber-2', name: 'عمر', city: 'الجزائر', neighborhood: 'باب الزوار' }]);
    mockRequestJoin.mockResolvedValue(true);
    mockInviteBarber.mockResolvedValue(true);
    mockCreateShop.mockResolvedValue(true);
  });

  it('searches by name/location and opens the shop inspection route', async () => {
    const screen = await render(<ShopSearchScreen />);
    await fireEvent.changeText(screen.getByLabelText('البحث عن محل'), 'Central');
    await fireEvent.press(screen.getByRole('button', { name: 'بحث' }));
    expect(await screen.findByText('Central Barber')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Central Barber' }));
    expect(mockRouterPush).toHaveBeenCalledWith('/shop-details/shop-1');
  });

  it('renders a useful empty state when no shops match', async () => {
    mockSearchShops.mockResolvedValue([]);
    const screen = await render(<ShopSearchScreen />);
    await fireEvent.changeText(screen.getByLabelText('البحث عن محل'), 'unknown');
    await fireEvent.press(screen.getByRole('button', { name: 'بحث' }));
    expect(await screen.findByText('لا توجد محلات مطابقة')).toBeTruthy();
  });

  it('supports owner invite search without exposing a raw shop ID field', async () => {
    const expoRouter = jest.requireMock('expo-router') as { useLocalSearchParams: jest.Mock };
    expoRouter.useLocalSearchParams.mockReturnValue({ mode: 'invite' });
    const screen = await render(<ShopSearchScreen />);
    await fireEvent.changeText(screen.getByLabelText('البحث عن حلاق'), 'عمر');
    await fireEvent.press(screen.getByRole('button', { name: 'بحث' }));
    expect(await screen.findByText('عمر')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'دعوة حلاق' }));
    expect(mockInviteBarber).toHaveBeenCalledWith('barber-2');
  });

  it('returns to the shop workspace from invite search', async () => {
    const expoRouter = jest.requireMock('expo-router') as { useLocalSearchParams: jest.Mock };
    expoRouter.useLocalSearchParams.mockReturnValue({ mode: 'invite' });
    const screen = await render(<ShopSearchScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'رجوع' }));

    expect(mockRouterReplace).toHaveBeenCalledWith('/shop');
  });

  it('does not show an idle shop-load error before the invite search is submitted', async () => {
    mockShopError = 'failed';
    const expoRouter = jest.requireMock('expo-router') as { useLocalSearchParams: jest.Mock };
    expoRouter.useLocalSearchParams.mockReturnValue({ mode: 'invite' });
    const screen = await render(<ShopSearchScreen />);
    expect(screen.queryByText('تعذّر تنفيذ هذه العملية. تحقق من البيانات أو الاتصال ثم حاول مرة أخرى.')).toBeNull();
  });

  it('validates shop creation before calling the service', async () => {
    const screen = await render(<ShopCreateScreen />);
    await fireEvent.changeText(screen.getByLabelText('اسم المحل'), 'محل النور');
    await fireEvent.press(screen.getByRole('button', { name: 'إنشاء محل' }));
    expect(await screen.findByText('الموقع مطلوب')).toBeTruthy();
    expect(mockCreateShop).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('رابط الخرائط'), 'https://maps.google.com/?q=36.7,3.0');
    await fireEvent.press(screen.getByRole('button', { name: 'إنشاء محل' }));
    expect(mockCreateShop).toHaveBeenCalledWith(expect.objectContaining({ name: 'محل النور' }));
  });
});
