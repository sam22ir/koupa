import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import FindScreen from '@/app/(customer)/find';

const mockSearchBarbers = jest.fn();
const mockSearchShops = jest.fn();
const mockSearchNearbyShops = jest.fn();
const mockRequestLocation = jest.fn();
let mockBookingError = '';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('@/src/services', () => ({
  SEARCH_PAGE_SIZE: 20,
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('@/src/hooks/useBooking', () => ({
  useBooking: () => ({
    searchBarbers: mockSearchBarbers,
    loading: false,
    get error() {
      return mockBookingError;
    },
  }),
}));

jest.mock('@/src/hooks/useShops', () => ({
  useShops: () => ({
    searchShops: mockSearchShops,
    searchNearbyShops: mockSearchNearbyShops,
    loading: false,
    error: 'failed',
  }),
}));

jest.mock('@/src/hooks/useDeviceLocation', () => ({
  useDeviceLocation: () => ({
    coords: null,
    status: 'idle',
    error: null,
    request: mockRequestLocation,
    clear: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

describe('customer find directory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBookingError = '';
    mockRequestLocation.mockResolvedValue({ latitude: 36.7538, longitude: 3.0588 });
  });

  it('does not show a shop error while the barbers directory is active', async () => {
    await render(<FindScreen />);

    expect(screen.queryByText('تعذّر تنفيذ هذه العملية. تحقق من البيانات أو الاتصال ثم حاول مرة أخرى.')).toBeNull();
  });

  it('shows a booking error from the automatic directory load', async () => {
    mockBookingError = 'failed';
    await render(<FindScreen />);
    expect(await screen.findByText('تعذّر تنفيذ هذه العملية. تحقق من البيانات أو الاتصال ثم حاول مرة أخرى.')).toBeTruthy();
  });

  it('loads the default barber directory automatically on entry', async () => {
    mockSearchBarbers.mockResolvedValue([
      {
        id: 'barber-1',
        name: 'سمير',
        bio: null,
        city: 'الجزائر',
        neighborhood: 'حيدرة',
        maps_url: null,
        phone: '0555000000',
        average_rating: 4.5,
        rating_count: 3,
        starting_price_dzd: 800,
        service_count: 1,
      },
    ]);

    await render(<FindScreen />);

    expect(await screen.findByText('سمير')).toBeTruthy();
    expect(mockSearchBarbers).toHaveBeenCalledWith('', '', 0);
    expect(screen.getByTestId('find-barbers-list')).toBeTruthy();
    expect(screen.queryByText('س')).toBeNull();
    expect(screen.getByRole('button', { name: 'سمير، عرض التفاصيل' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'المحلات القريبة مني' })).toBeTruthy();
  });

  it('requests location and searches nearby shops after the customer opts in', async () => {
    mockSearchNearbyShops.mockResolvedValue([
      {
        id: 'shop-1',
        name: 'محل قريب',
        bio: null,
        maps_url: null,
        city: 'الجزائر',
        neighborhood: 'حيدرة',
        average_rating: 4.5,
        rating_count: 3,
        owner_name: 'سمير',
        distance_km: 1.4,
      },
    ]);

    await render(<FindScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'المحلات القريبة مني' }));

    await waitFor(() => expect(mockRequestLocation).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockSearchNearbyShops).toHaveBeenCalledWith(36.7538, 3.0588, '', 0));
    expect(await screen.findByText('محل قريب')).toBeTruthy();
    expect(screen.getByText('1.4 كم')).toBeTruthy();
    expect(screen.getByTestId('find-shops-list')).toBeTruthy();
  });

  it('clears stale shop rows when a nearby refresh fails', async () => {
    mockSearchShops.mockResolvedValue([
      {
        id: 'shop-stale',
        name: 'نتيجة قديمة',
        bio: null,
        maps_url: null,
        city: 'الجزائر',
        neighborhood: 'حيدرة',
        average_rating: 4,
        rating_count: 1,
        owner_name: 'سمير',
      },
    ]);
    mockSearchNearbyShops.mockResolvedValue(null);

    await render(<FindScreen />);
    await fireEvent.press(screen.getByRole('tab', { name: 'محلات' }));
    expect(await screen.findByText('نتيجة قديمة')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'المحلات القريبة مني' }));

    await waitFor(() => expect(screen.queryByText('نتيجة قديمة')).toBeNull());
    expect(screen.getByText('تعذّر تنفيذ هذه العملية. تحقق من البيانات أو الاتصال ثم حاول مرة أخرى.')).toBeTruthy();
  });

  it('keeps rating filters inside the filter control and nearby on the first view', async () => {
    mockSearchBarbers.mockResolvedValue([
      { id: 'barber-1', name: 'أمين', bio: null, city: 'الجزائر', neighborhood: 'حيدرة', maps_url: null, phone: '0555000000', average_rating: 4.8, rating_count: 5, starting_price_dzd: 800, service_count: 1 },
      { id: 'barber-2', name: 'سمير', bio: null, city: 'الجزائر', neighborhood: 'باب الواد', maps_url: null, phone: '0555000001', average_rating: 3.2, rating_count: 2, starting_price_dzd: 700, service_count: 1 },
    ]);
    await render(<FindScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'التصفية' }));
    expect(screen.getByText('التقييم')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '4 نجوم فأعلى' }));

    expect(screen.getByText('أمين')).toBeTruthy();
    expect(screen.queryByText('سمير')).toBeNull();
  });
});
