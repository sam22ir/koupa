import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import BookScreen from '@/app/book/[barberId]';
import { bookingDates } from '@/src/booking';

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
    push: (...args: unknown[]) => mockPush(...args),
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

let mockGuestBrowsing = false;
let mockSessionState: { session: { user: { email: string } } | null; emailConfirmed: boolean } = { session: null, emailConfirmed: true };
const mockResendEmailConfirmation = jest.fn();
const mockSetPendingIntent = jest.fn();
const mockPush = jest.fn();

jest.mock('@/src/providers/SessionProvider', () => ({
  useAppSession: () => ({
    guestBrowsing: mockGuestBrowsing,
    session: mockSessionState.session,
    emailConfirmed: mockSessionState.emailConfirmed,
    resendEmailConfirmation: (...args: unknown[]) => mockResendEmailConfirmation(...args),
  }),
}));

jest.mock('@/src/navigation/pendingIntent', () => ({
  setPendingIntentFromPath: (...args: unknown[]) => mockSetPendingIntent(...args),
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
    mockGuestBrowsing = false;
    mockSessionState = { session: null, emailConfirmed: true };
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
    await screen.findByLabelText('حلاقة · 800 دج');
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
    await screen.findByLabelText('حلاقة · 800 دج');
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

  it('lets a guest see real slots but asks them to sign in to confirm', async () => {
    mockGuestBrowsing = true;
    mockParams = { barberId: 'barber-1', serviceId: 'cut' };
    await render(<BookScreen />);
    await goToRecap();

    expect(mockGetSlots).toHaveBeenCalledWith('barber-1', 'cut', expect.any(String));
    expect(screen.queryByRole('button', { name: 'تأكيد الحجز' })).toBeNull();

    await fireEvent.press(screen.getByTestId('guest-sign-in-to-book'));

    expect(mockBook).not.toHaveBeenCalled();
    // The chosen date and time travel with the pending booking.
    expect(mockSetPendingIntent).toHaveBeenCalledWith('/book/barber-1', {
      serviceId: 'cut',
      date: bookingDates(1)[0],
      slot: '2026-08-05T10:00:00Z',
      returnTo: '/barber/barber-1',
    });
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/(auth)/sign-up', params: { role: 'customer' } });
  });

  it('asks an unconfirmed customer to confirm their email instead of a failing confirm button', async () => {
    mockSessionState = { session: { user: { email: 'sara@example.com' } }, emailConfirmed: false };
    mockParams = { barberId: 'barber-1', serviceId: 'cut' };
    mockResendEmailConfirmation.mockResolvedValueOnce(undefined);
    await render(<BookScreen />);
    await goToRecap();

    expect(screen.queryByRole('button', { name: 'تأكيد الحجز' })).toBeNull();
    expect(screen.getByText('أكد بريدك لإتمام الحجز')).toBeTruthy();
    expect(screen.getByText('sara@example.com')).toBeTruthy();
    // The link must bring them back to this booking.
    expect(mockSetPendingIntent).toHaveBeenLastCalledWith('/book/barber-1', {
      serviceId: 'cut',
      date: bookingDates(1)[0],
      slot: '2026-08-05T10:00:00Z',
      returnTo: '/barber/barber-1',
    });

    await fireEvent.press(screen.getByTestId('resend-booking-confirmation'));
    await waitFor(() => expect(mockResendEmailConfirmation).toHaveBeenCalledWith('sara@example.com'));
    expect(await screen.findByText('تم إرسال رابط جديد.')).toBeTruthy();
    expect(mockBook).not.toHaveBeenCalled();
  });

  it('lets a confirmed customer book normally', async () => {
    mockSessionState = { session: { user: { email: 'sara@example.com' } }, emailConfirmed: true };
    await render(<BookScreen />);
    await goToRecap();

    expect(screen.getByRole('button', { name: 'تأكيد الحجز' })).toBeTruthy();
    expect(screen.queryByText('أكد بريدك لإتمام الحجز')).toBeNull();
  });

  it('reopens a carried booking on the recap with its date and time', async () => {
    const day = bookingDates(1)[0];
    mockParams = { barberId: 'barber-1', serviceId: 'cut', date: day, slot: '2026-08-05T10:00:00Z' };
    await render(<BookScreen />);

    expect(await screen.findByText('راجع حجزك')).toBeTruthy();
    expect(mockGetSlots).toHaveBeenCalledWith('barber-1', 'cut', day);
    expect(screen.getByText('11:00 ص')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'تأكيد الحجز' })).toBeTruthy();
  });

  it('shows the day\'s slots when the carried time was taken meanwhile', async () => {
    const day = bookingDates(1)[0];
    mockParams = { barberId: 'barber-1', serviceId: 'cut', date: day, slot: '2026-08-05T08:00:00Z' };
    await render(<BookScreen />);

    expect(await screen.findByText('اختر الوقت')).toBeTruthy();
    expect(screen.getByText('11:00 ص')).toBeTruthy();
    expect(screen.queryByText('راجع حجزك')).toBeNull();
  });

  it('ignores a carried date outside the booking window', async () => {
    mockParams = { barberId: 'barber-1', serviceId: 'cut', date: '2020-01-01', slot: '2026-08-05T10:00:00Z' };
    await render(<BookScreen />);
    await screen.findByLabelText('حلاقة · 800 دج');

    expect(screen.queryByText('راجع حجزك')).toBeNull();
    await waitFor(() => expect(mockGetSlots).toHaveBeenLastCalledWith('barber-1', 'cut', bookingDates(1)[0]));
  });

  it('keeps the loaded barber and slots when a later barber request is superseded', async () => {
    mockParams = { barberId: 'barber-1', serviceId: 'cut' };
    // The booking window changes the date list once the barber loads, which re-runs
    // the barber request; a superseded request resolves with null.
    const loaded = (await mockGetBarber()) as unknown[];
    mockGetBarber.mockReset();
    mockGetBarber.mockResolvedValueOnce(loaded).mockResolvedValue(null);
    await render(<BookScreen />);
    await goToSlots();

    await waitFor(() => expect(mockGetBarber.mock.calls.length).toBeGreaterThan(1));
    expect(screen.getByText('سمير')).toBeTruthy();
    expect(screen.getByText('11:00 ص')).toBeTruthy();
  });

  it('clears a selected slot when the service changes', async () => {
    await render(<BookScreen />);
    await goToSlots();
    await fireEvent.press(screen.getByText('11:00 ص'));
    await fireEvent.press(screen.getByRole('button', { name: 'رجوع' }));
    await fireEvent.press(screen.getByLabelText('لحية · 500 دج'));
    await fireEvent.press(screen.getByRole('button', { name: 'التالي' }));
    expect(screen.getByRole('button', { name: 'التالي' })).toBeDisabled();
  });

  it('returns to the declared Shop source instead of a barber profile', async () => {
    mockParams = { barberId: 'barber-1', returnTo: '/shop/shop-1' };
    await render(<BookScreen />);
    await screen.findByLabelText('حلاقة · 800 دج');

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
    await screen.findByLabelText('حلاقة · 800 دج');

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
