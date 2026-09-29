import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import FindScreen from '@/app/(customer)/find';

const mockSearchBarbers = jest.fn();
const mockSearchNearbyBarbers = jest.fn();
const mockSearchInBounds = jest.fn();
const mockSearchShops = jest.fn();
const mockSearchNearbyShops = jest.fn();
const mockRequestLocation = jest.fn();
const mockConsumeCity = jest.fn();
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

let mockGuestBrowsing = false;
jest.mock('@/src/providers/SessionProvider', () => ({
  useAppSession: () => ({ guestBrowsing: mockGuestBrowsing }),
}));

jest.mock('@/src/navigation/customerFindPreference', () => ({
  consumeCustomerFindCityPreference: () => mockConsumeCity(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('@/src/hooks/useBooking', () => ({
  useBooking: () => ({
    searchBarbers: mockSearchBarbers,
    searchNearbyBarbers: mockSearchNearbyBarbers,
    searchBarbersInBounds: mockSearchInBounds,
    loading: false,
    get error() {
      return mockBookingError;
    },
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockMapProps: any;
jest.mock('@/src/features/customer-find/BarbersMap', () => ({
  BarbersMap: (props: unknown) => {
    mockMapProps = props;
    const { View } = jest.requireActual('react-native');
    return <View testID="mock-barbers-map" />;
  },
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

function nearbyBarber(id: string, name: string, distanceKm: number) {
  return {
    id,
    name,
    bio: null,
    city: 'الجزائر',
    neighborhood: 'حيدرة',
    maps_url: null,
    phone: '',
    average_rating: 4.5,
    rating_count: 3,
    starting_price_dzd: 800,
    service_count: 1,
    latitude: 36.75,
    longitude: 3.06,
    distance_km: distanceKm,
  };
}

describe('customer find directory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBookingError = '';
    mockMapProps = undefined;
    mockGuestBrowsing = false;
    mockConsumeCity.mockResolvedValue(null);
    mockRequestLocation.mockResolvedValue({ latitude: 36.7538, longitude: 3.0588 });
  });

  it('does not show a shop error while the barbers directory is active', async () => {
    await render(<FindScreen />);

    expect(screen.queryByText('تعذّر تنفيذ هذه العملية. تحقق من البيانات أو الاتصال ثم حاول مرة أخرى.')).toBeNull();
  });

  it('shows guests only the barber directory, with nearest-first but no shops', async () => {
    mockGuestBrowsing = true;
    mockSearchBarbers.mockResolvedValue([]);
    mockSearchNearbyBarbers.mockResolvedValue([nearbyBarber('barber-near', 'أمين القريب', 1.6)]);
    await render(<FindScreen />);

    await waitFor(() => expect(mockSearchBarbers).toHaveBeenCalledWith('', '', 0));
    expect(screen.queryByRole('tab', { name: 'محلات' })).toBeNull();

    await fireEvent.press(screen.getByTestId('find-near-me'));

    await waitFor(() => expect(mockSearchNearbyBarbers).toHaveBeenCalledWith(36.7538, 3.0588, '', 0));
    expect(await screen.findByText('أمين القريب')).toBeTruthy();
    expect(mockSearchNearbyShops).not.toHaveBeenCalled();
  });

  it('sorts the barbers list nearest-first and shows each distance', async () => {
    mockSearchBarbers.mockResolvedValue([]);
    mockSearchNearbyBarbers.mockResolvedValue([
      nearbyBarber('b1', 'الأقرب', 0.4),
      nearbyBarber('b2', 'الأبعد', 12),
    ]);
    await render(<FindScreen />);

    await fireEvent.press(screen.getByTestId('find-near-me'));

    expect(await screen.findByText('الأقرب')).toBeTruthy();
    expect(screen.getByText('400 م')).toBeTruthy();
    expect(screen.getByText('12 كم')).toBeTruthy();
    expect(mockSearchNearbyShops).not.toHaveBeenCalled();
  });

  it('widens to every barber when none sit inside the radius', async () => {
    mockSearchNearbyBarbers.mockResolvedValue([]);
    mockSearchBarbers.mockResolvedValue([nearbyBarber('far', 'حلاق بعيد', 0)]);
    await render(<FindScreen />);

    await fireEvent.press(screen.getByTestId('find-near-me'));

    expect(await screen.findByText('حلاق بعيد')).toBeTruthy();
    expect(screen.getByText('لا توجد نتائج ضمن 25 كم. نعرض الكل.')).toBeTruthy();
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
    expect(screen.getByTestId('find-near-me')).toBeTruthy();
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
    await fireEvent.press(screen.getByRole('tab', { name: 'محلات' }));
    await fireEvent.press(screen.getByTestId('find-near-me'));

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

    await fireEvent.press(screen.getByTestId('find-near-me'));

    await waitFor(() => expect(screen.queryByText('نتيجة قديمة')).toBeNull());
    expect(screen.getByText('تعذّر تنفيذ هذه العملية. تحقق من البيانات أو الاتصال ثم حاول مرة أخرى.')).toBeTruthy();
  });

  it('offers nearby and rating filters as chips on the first view', async () => {
    mockSearchBarbers.mockResolvedValue([
      { id: 'barber-1', name: 'أمين', bio: null, city: 'الجزائر', neighborhood: 'حيدرة', maps_url: null, phone: '0555000000', average_rating: 4.8, rating_count: 5, starting_price_dzd: 800, service_count: 1 },
      { id: 'barber-2', name: 'سمير', bio: null, city: 'الجزائر', neighborhood: 'باب الواد', maps_url: null, phone: '0555000001', average_rating: 3.2, rating_count: 2, starting_price_dzd: 700, service_count: 1 },
    ]);
    await render(<FindScreen />);

    await fireEvent.press(screen.getByRole('button', { name: '4 نجوم فأعلى' }));

    expect(screen.getByText('أمين')).toBeTruthy();
    expect(screen.queryByText('سمير')).toBeNull();
  });

  it('falls back to every barber when the saved city has no published barbers', async () => {
    mockConsumeCity.mockResolvedValue('تبسة');
    mockSearchBarbers.mockImplementation((_query: string, city: string) => Promise.resolve(
      city
        ? []
        : [{
          id: 'barber-1',
          name: 'سمير',
          bio: null,
          city: 'الشريعة',
          neighborhood: 'طريق الضلعة',
          maps_url: null,
          phone: '0555000000',
          average_rating: 0,
          rating_count: 0,
          starting_price_dzd: 800,
          service_count: 1,
        }],
    ));

    await render(<FindScreen />);

    expect(await screen.findByText('سمير')).toBeTruthy();
    expect(mockSearchBarbers).toHaveBeenNthCalledWith(1, 'تبسة', 'تبسة', 0);
    expect(mockSearchBarbers).toHaveBeenNthCalledWith(2, '', '', 0);
    expect(screen.getByText('لا يوجد حلاقون في مدينتك بعد. نعرض كل الحلاقين المتاحين.')).toBeTruthy();
  });

  it('widens the search to every shop when nothing sits inside the radius', async () => {
    mockSearchNearbyShops.mockResolvedValue([]);
    mockSearchShops.mockResolvedValue([
      {
        id: 'shop-far',
        name: 'محل بعيد',
        bio: null,
        maps_url: null,
        city: 'الشريعة',
        neighborhood: 'طريق الضلعة',
        average_rating: 0,
        rating_count: 0,
        owner_name: 'سمير',
      },
    ]);

    await render(<FindScreen />);
    await fireEvent.press(screen.getByRole('tab', { name: 'محلات' }));
    await fireEvent.press(screen.getByTestId('find-near-me'));

    await waitFor(() => expect(mockSearchNearbyShops).toHaveBeenCalledWith(36.7538, 3.0588, '', 0));
    expect(await screen.findByText('محل بعيد')).toBeTruthy();
    expect(mockSearchShops).toHaveBeenCalledWith('', 0);
    expect(screen.getByText('لا توجد نتائج ضمن 25 كم. نعرض الكل.')).toBeTruthy();
  });

  describe('map view', () => {
    const area = { minLatitude: 36.6, minLongitude: 2.9, maxLatitude: 36.9, maxLongitude: 3.2 };
    const pin = (id: string, name: string) => ({
      id,
      name,
      city: 'الجزائر',
      neighborhood: 'حيدرة',
      average_rating: 4.5,
      rating_count: 3,
      starting_price_dzd: 700,
      latitude: 36.75,
      longitude: 3.05,
    });

    async function openMap() {
      mockSearchBarbers.mockResolvedValue([]);
      await render(<FindScreen />);
      await fireEvent.press(screen.getByTestId('find-map-toggle'));
      expect(await screen.findByTestId('find-map-section')).toBeTruthy();
    }

    it('swaps the list for a map and searches the first viewport by itself', async () => {
      mockSearchInBounds.mockResolvedValue([pin('b1', 'أمين')]);
      await openMap();

      expect(screen.queryByTestId('find-barbers-list')).toBeNull();
      await act(async () => mockMapProps.onBoundsChange(area));

      await waitFor(() => expect(mockSearchInBounds).toHaveBeenCalledWith(area, ''));
      await waitFor(() => expect(mockMapProps.markers).toEqual([
        { id: 'b1', name: 'أمين', latitude: 36.75, longitude: 3.05 },
      ]));
    });

    it('offers "search this area" only after a real pan, then searches again', async () => {
      mockSearchInBounds.mockResolvedValue([pin('b1', 'أمين')]);
      await openMap();
      await act(async () => mockMapProps.onBoundsChange(area));
      await waitFor(() => expect(mockSearchInBounds).toHaveBeenCalledTimes(1));

      await act(async () => mockMapProps.onBoundsChange({ ...area, minLatitude: 36.601, maxLatitude: 36.901 }));
      expect(screen.queryByTestId('find-search-area')).toBeNull();

      const panned = { minLatitude: 36.9, minLongitude: 3.2, maxLatitude: 37.2, maxLongitude: 3.5 };
      await act(async () => mockMapProps.onBoundsChange(panned));
      await fireEvent.press(await screen.findByTestId('find-search-area'));

      await waitFor(() => expect(mockSearchInBounds).toHaveBeenLastCalledWith(panned, ''));
      expect(screen.queryByTestId('find-search-area')).toBeNull();
    });

    it('shows a preview card for the tapped pin and opens that barber', async () => {
      mockSearchInBounds.mockResolvedValue([pin('b1', 'أمين'), pin('b2', 'سمير')]);
      await openMap();
      await act(async () => mockMapProps.onBoundsChange(area));
      await waitFor(() => expect(mockMapProps.markers).toHaveLength(2));
      expect(screen.queryByTestId('find-map-card')).toBeNull();

      await act(async () => mockMapProps.onSelect('b2'));
      expect(mockMapProps.selectedId).toBe('b2');
      await fireEvent.press(await screen.findByTestId('find-map-card'));

      expect(router.push).toHaveBeenCalledWith({
        pathname: '/barber/[id]',
        params: { id: 'b2', returnTo: '/find' },
      });
    });

    it('tells the customer when an area has no barbers', async () => {
      mockSearchInBounds.mockResolvedValue([]);
      await openMap();
      await act(async () => mockMapProps.onBoundsChange(area));

      expect(await screen.findByText('لا يوجد حلاقون في هذه المنطقة. حرّك الخريطة أو صغّرها.')).toBeTruthy();
    });

    it('centers the map on the customer when they ask', async () => {
      mockSearchInBounds.mockResolvedValue([]);
      await openMap();

      await fireEvent.press(screen.getByTestId('find-map-locate'));

      await waitFor(() => expect(mockMapProps.focus).toEqual(
        expect.objectContaining({ latitude: 36.7538, longitude: 3.0588 }),
      ));
    });

    it('is available to guests, and only for barbers', async () => {
      mockGuestBrowsing = true;
      mockSearchInBounds.mockResolvedValue([]);
      await openMap();
      expect(screen.getByTestId('find-map-section')).toBeTruthy();
    });

    it('goes back to the list, and is hidden on the shops tab', async () => {
      await openMap();
      await fireEvent.press(screen.getByTestId('find-map-toggle'));
      expect(await screen.findByTestId('find-barbers-list')).toBeTruthy();

      await fireEvent.press(screen.getByRole('tab', { name: 'محلات' }));
      expect(screen.queryByTestId('find-map-toggle')).toBeNull();
    });
  });
});
