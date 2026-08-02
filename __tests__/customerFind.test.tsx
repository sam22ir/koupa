import { render, screen } from '@testing-library/react-native';

import FindScreen from '@/app/(customer)/find';

const mockSearchBarbers = jest.fn();
const mockSearchShops = jest.fn();
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
    loading: false,
    error: 'failed',
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
}));

describe('customer find directory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBookingError = '';
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
  });
});
