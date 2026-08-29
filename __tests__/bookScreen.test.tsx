import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import BookScreen from '@/app/book/[barberId]';

const mockGetBarber = jest.fn();
const mockGetSlots = jest.fn();
const mockBook = jest.fn();
const mockReschedule = jest.fn();
const mockDismissTo = jest.fn();
const mockDismissAll = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = { barberId: 'barber-1' };

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: (...args: unknown[]) => mockReplace(...args),
    dismissTo: (...args: unknown[]) => mockDismissTo(...args),
    dismissAll: () => mockDismissAll(),
  },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

jest.mock('@/src/hooks/useBooking', () => ({
  useBooking: () => ({
    getBarber: mockGetBarber,
    getSlots: mockGetSlots,
    book: mockBook,
    reschedule: mockReschedule,
    loading: false,
    error: '',
  }),
}));

describe('booking selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { barberId: 'barber-1' };
    mockBook.mockResolvedValue(true);
    mockReschedule.mockResolvedValue(true);
    mockGetBarber.mockResolvedValue([{
      id: 'barber-1',
      name: 'سمير',
      bio: null,
      city: 'الجزائر',
      neighborhood: 'حيدرة',
      maps_url: null,
      phone: '0555000000',
      booking_window_days: 1,
      average_rating: 4.8,
      rating_count: 4,
      starting_price_dzd: 800,
      service_count: 2,
      services: [
        { id: 'cut', name: 'حلاقة', price_dzd: 800, duration_minutes: 30 },
        { id: 'beard', name: 'لحية', price_dzd: 500, duration_minutes: 20 },
      ],
      weekly_hours: [],
    }]);
    mockGetSlots.mockResolvedValue([
      { starts_at: '2026-08-05T10:00:00Z', ends_at: '2026-08-05T10:30:00Z' },
    ]);
  });

  async function goToSlots() {
    await screen.findByText('حلاقة · 800 دج');
    await fireEvent.press(screen.getByRole('button', { name: 'التالي' }));
    await waitFor(() => expect(screen.getByText('11:00 ص')).toBeTruthy());
  }

  async function goToRecap() {
    await goToSlots();
    await fireEvent.press(screen.getByText('11:00 ص'));
    await fireEvent.press(screen.getByRole('button', { name: 'التالي' }));
    expect(await screen.findByText('راجع حجزك')).toBeTruthy();
  }

  it('asks for date, then a slot, then a recap before confirm', async () => {
    await render(<BookScreen />);
    await screen.findByText('حلاقة · 800 دج');
    expect(screen.queryByText('11:00 ص')).toBeNull();
    expect(screen.queryByRole('button', { name: 'تأكيد الحجز' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'التالي' }));
    await waitFor(() => expect(screen.getByText('11:00 ص')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'التالي' })).toBeDisabled();

    await fireEvent.press(screen.getByText('11:00 ص'));
    await fireEvent.press(screen.getByRole('button', { name: 'التالي' }));

    expect(await screen.findByText('راجع حجزك')).toBeTruthy();
    expect(screen.getByText('حلاقة')).toBeTruthy();
    expect(screen.getByText('800 دج')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'تأكيد الحجز' })).toBeTruthy();
  });

  it('clears a selected slot when the service changes', async () => {
    await render(<BookScreen />);
    await goToSlots();
    await fireEvent.press(screen.getByText('11:00 ص'));
    await fireEvent.press(screen.getByRole('button', { name: 'رجوع' }));
    await fireEvent.press(screen.getByText('لحية · 500 دج'));
    await fireEvent.press(screen.getByRole('button', { name: 'التالي' }));
    expect(screen.getByRole('button', { name: 'التالي' })).toBeDisabled();
  });

  it('returns to the declared Shop source instead of a barber profile', async () => {
    mockParams = { barberId: 'barber-1', returnTo: '/shop/shop-1' };
    await render(<BookScreen />);
    await screen.findByText('حلاقة · 800 دج');

    await fireEvent.press(screen.getByRole('button', { name: 'رجوع' }));

    expect(mockDismissTo).toHaveBeenCalledWith('/shop/shop-1');
  });

  it('returns rescheduling to its appointment detail and ends there after success', async () => {
    mockParams = {
      barberId: 'barber-1',
      appointmentId: 'appointment-1',
      serviceId: 'cut',
      returnTo: '/appointment/appointment-1',
    };
    await render(<BookScreen />);
    await screen.findByText('حلاقة · 800 دج');

    await fireEvent.press(screen.getByRole('button', { name: 'رجوع' }));
    expect(mockDismissTo).toHaveBeenCalledWith('/appointment/appointment-1');

    await goToRecap();
    await fireEvent.press(screen.getByRole('button', { name: 'إعادة جدولة' }));
    await waitFor(() => expect(mockReschedule).toHaveBeenCalled());
    expect(mockDismissAll).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/(customer)/appointments');
  });

  it('clears the profile stack before finishing a new booking in Appointments', async () => {
    await render(<BookScreen />);
    await goToRecap();
    await fireEvent.press(screen.getByRole('button', { name: 'تأكيد الحجز' }));

    await waitFor(() => expect(mockBook).toHaveBeenCalled());
    expect(mockDismissAll).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/(customer)/appointments');
  });
});
