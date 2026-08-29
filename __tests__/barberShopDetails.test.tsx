import { fireEvent, render } from '@testing-library/react-native';

import ShopDetailsScreen from '@/app/(barber)/shop-details/[id]';

const mockRouterDismissTo = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), dismissTo: mockRouterDismissTo, replace: mockRouterReplace },
  useRouter: () => ({ push: jest.fn(), dismissTo: mockRouterDismissTo, replace: mockRouterReplace }),
  useLocalSearchParams: jest.fn(() => ({ id: 'shop-1' })),
}));

const mockGetShop = jest.fn();
const mockRequestJoin = jest.fn();
const mockRemoveShop = jest.fn();
let mockOwnedShop: { readonly id: string } | null = null;

jest.mock('@/src/hooks/useShops', () => ({
  useShops: () => ({
    getShop: mockGetShop,
    requestJoin: mockRequestJoin,
    removeShop: mockRemoveShop,
    ownedShop: mockOwnedShop,
    relationship: { kind: 'none' },
    membership: null,
    loading: false,
    saving: false,
    error: '',
  }),
}));

jest.mock('@/src/providers/SessionProvider', () => ({
  useAppSession: () => ({ session: { user: { id: 'barber-1' } } }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

describe('barber Shop details', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetShop.mockResolvedValue({
      id: 'shop-1',
      name: 'محل النور',
      bio: 'حلاقة رجالية',
      maps_url: 'https://maps.google.com',
      city: 'الجزائر',
      neighborhood: 'حيدرة',
      average_rating: 4.5,
      rating_count: 12,
      owner_name: 'سمير',
      barbers: [{ id: 'barber-1', name: 'سمير', phone: '0555', is_owner: true }],
    });
    mockRequestJoin.mockResolvedValue(true);
    mockRemoveShop.mockResolvedValue(true);
    mockOwnedShop = null;
  });

  it('shows location, owner, affiliated barbers, and a join action', async () => {
    const screen = await render(<ShopDetailsScreen />);
    expect(await screen.findByText('محل النور')).toBeTruthy();
    expect(screen.getByText(/حيدرة/)).toBeTruthy();
    expect(screen.getAllByText(/سمير/).length).toBeGreaterThan(0);
    const actions = screen.getAllByRole('button');
    await fireEvent.press(actions[actions.length - 1]);
    expect(mockRequestJoin).toHaveBeenCalledWith('shop-1');
    expect(mockRouterDismissTo).toHaveBeenCalledWith('/(barber)/shop');
  });

  it('confirms and completes owned-shop removal without relying on native Alert', async () => {
    mockOwnedShop = { id: 'shop-1' };
    const screen = await render(<ShopDetailsScreen />);
    await screen.findByText('محل النور');

    await fireEvent.press(screen.getByRole('button', { name: 'حذف المحل' }));

    expect(screen.getByTestId('delete-shop-confirmation')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('delete-shop-confirm'));

    expect(mockRemoveShop).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).toHaveBeenCalledWith('/shop');
  });
});
