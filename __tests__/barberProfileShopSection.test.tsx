import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import BarberProfileScreen from '../app/(barber)/profile';
import { useShops } from '../src/hooks/useShops';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

jest.mock('../src/providers/SessionProvider', () => ({
  useAppSession: () => ({
    profile: { id: 'barber-1', role: 'barber', name: 'سمير', phone: '0555000000' },
    signOut: jest.fn(async () => undefined),
    legalDocuments: [],
  }),
}));
jest.mock('../src/hooks/useAccountLifecycle', () => ({
  useAccountLifecycle: () => ({ loading: false, error: null, deleteAccount: jest.fn(async () => true) }),
}));
jest.mock('../src/hooks/useShops', () => ({ useShops: jest.fn() }));

const mockUseShops = useShops as jest.MockedFunction<typeof useShops>;

describe('barber profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseShops.mockReturnValue({
      state: {
        ownedShop: {
          id: 'shop-1',
          name: 'محل النور',
          bio: null,
          maps_url: null,
          city: 'الجزائر',
          neighborhood: 'حيدرة',
          average_rating: 4.5,
          rating_count: 12,
          owner_name: 'سمير',
        },
        membership: null,
        relationship: { kind: 'none' },
        pendingRequests: [],
        members: [
          {
            id: 'member-1',
            shop_id: 'shop-1',
            barber_id: 'barber-2',
            status: 'active',
            barber_name: 'عمر',
          },
        ],
      },
      relationship: { kind: 'none' },
      ownedShop: {
        id: 'shop-1',
        name: 'محل النور',
        bio: null,
        maps_url: null,
        city: 'الجزائر',
        neighborhood: 'حيدرة',
        average_rating: 4.5,
        rating_count: 12,
        owner_name: 'سمير',
      },
      membership: null,
      pendingInvitation: null,
      pendingRequest: null,
      loading: false,
      saving: false,
      error: '',
      message: '',
      retry: jest.fn(async () => undefined),
    } as never);
  });

  it('keeps shop management out of the profile surface', async () => {
    await render(<BarberProfileScreen />);

    expect(screen.queryByTestId('profile-shop-section')).toBeNull();
    expect(screen.queryByText('محل النور')).toBeNull();
    expect(screen.getByText('الحساب')).toBeTruthy();
    expect(mockUseShops).not.toHaveBeenCalled();
  });
});
