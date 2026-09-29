import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

// These screens pull in the moderation actions, which import the real Supabase
// client at module load. Rendering a screen must not require credentials.
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    from: jest.fn(),
  },
}));

import BarberProfileScreen from '@/app/barber/[id]';
import ShopProfileScreen from '@/app/shop/[id]';

const mockPush = jest.fn();
const mockDismissTo = jest.fn();
const mockSetPendingIntent = jest.fn();
let mockParams: Record<string, string> = { id: 'barber-1' };
let mockProfile: { role: 'customer' | 'barber' } | null = null;
let mockGuestBrowsing = false;
let mockBarber = {
  id: 'barber-1',
  name: 'سمير',
  bio: 'حلاقة عصرية وعناية دقيقة بالتفاصيل.',
  city: 'الجزائر',
  neighborhood: 'حيدرة',
  maps_url: null,
  phone: '0555000000',
  average_rating: 4.8,
  rating_count: 4,
  services: [{ id: 'cut', name: 'حلاقة', price_dzd: 800, duration_minutes: 30 }],
  weekly_hours: [{ day_of_week: 0, starts_at: '09:00:00', ends_at: '18:00:00' }],
  shop: {
    id: 'shop-1',
    name: 'صالون النور',
    city: 'الجزائر',
    neighborhood: 'حيدرة',
    maps_url: 'https://maps.google.com/?q=36.7,3.0',
    average_rating: 4.5,
    rating_count: 2,
  },
};

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    dismissTo: (...args: unknown[]) => mockDismissTo(...args),
  },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/src/navigation/pendingIntent', () => ({
  setPendingIntentFromPath: (...args: unknown[]) => mockSetPendingIntent(...args),
}));

jest.mock('@/src/providers/SessionProvider', () => ({
  useAppSession: () => ({ profile: mockProfile, guestBrowsing: mockGuestBrowsing }),
}));

jest.mock('@/src/hooks/useBooking', () => ({
  useBooking: () => ({
    loading: false,
    error: '',
    getBarber: jest.fn(async () => [mockBarber]),
  }),
}));

jest.mock('@/src/hooks/useShops', () => ({
  useShops: () => ({
    error: '',
    getShop: jest.fn().mockResolvedValue({
      id: 'shop-1',
      name: 'محل النور',
      owner_name: 'سمير',
      bio: null,
      maps_url: null,
      city: 'الجزائر',
      neighborhood: 'حيدرة',
      barbers: [{ id: 'barber-1', name: 'سمير', phone: '0555', is_owner: true }],
    }),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

describe('public profile role navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfile = null;
    mockGuestBrowsing = false;
    mockParams = { id: 'barber-1' };
    mockBarber = { ...mockBarber, services: [{ id: 'cut', name: 'حلاقة', price_dzd: 800, duration_minutes: 30 }] };
  });

  it('sends an anonymous Barber booking attempt through auth with a pending intent', async () => {
    await render(<BarberProfileScreen />);
    await screen.findByText('سمير');

    await fireEvent.press(screen.getByRole('radio', { name: 'حلاقة' }));
    await fireEvent.press(screen.getByRole('button', { name: 'احجز' }));

    expect(mockSetPendingIntent).toHaveBeenCalledWith('/book/barber-1', { serviceId: 'cut', returnTo: '/barber/barber-1' });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(auth)/sign-up',
      params: { role: 'customer' },
    });
  });

  it('opens the booking page directly for a browsing guest', async () => {
    mockGuestBrowsing = true;
    await render(<BarberProfileScreen />);
    await screen.findByText('سمير');

    await fireEvent.press(screen.getByRole('radio', { name: 'حلاقة' }));
    await fireEvent.press(screen.getByRole('button', { name: 'احجز' }));

    expect(mockSetPendingIntent).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/book/[barberId]',
      params: { barberId: 'barber-1', serviceId: 'cut', returnTo: '/barber/barber-1' },
    });
  });

  it('does not expose Customer booking to Barber accounts', async () => {
    mockProfile = { role: 'barber' };
    await render(<BarberProfileScreen />);
    await screen.findByText('سمير');

    expect(screen.queryByRole('button', { name: 'احجز' })).toBeNull();
  });

  it('opens booking directly for Customer accounts from a Barber profile', async () => {
    mockProfile = { role: 'customer' };
    await render(<BarberProfileScreen />);
    await screen.findByText('سمير');

    await fireEvent.press(screen.getByRole('radio', { name: 'حلاقة' }));
    await fireEvent.press(screen.getByRole('button', { name: 'احجز' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/book/[barberId]',
      params: { barberId: 'barber-1', serviceId: 'cut', returnTo: '/barber/barber-1' },
    });
  });

  it('renders the identity card, phone, rating, and affiliated shop card', async () => {
    await render(<BarberProfileScreen />);
    await screen.findByText('سمير');

    expect(screen.getByText('حلاقة عصرية وعناية دقيقة بالتفاصيل.')).toBeTruthy();
    expect(screen.getByText(/0555000000/)).toBeTruthy();
    expect(screen.getByText('صالون النور')).toBeTruthy();
    expect(screen.getByText(/4\.5/)).toBeTruthy();
    // Weekly hours: the working day shows its span, the rest read as closed.
    expect(screen.getByText(/09:00 - 18:00/)).toBeTruthy();
    expect(screen.getAllByText('مغلق')).toHaveLength(6);
    await fireEvent.press(screen.getByRole('button', { name: /عرض المحل/ }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/shop/[id]', params: { id: 'shop-1', returnTo: '/barber/barber-1' } });
  });

  it('requires service selection and hides booking when no active service exists', async () => {
    mockBarber = { ...mockBarber, services: [] };
    await render(<BarberProfileScreen />);

    expect(await screen.findByText(/لا توجد خدمات متاحة/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'احجز' })).toBeNull();
  });

  it('does not expose booking rows to Barber accounts on a Shop profile', async () => {
    mockProfile = { role: 'barber' };
    mockParams = { id: 'shop-1' };
    await render(<ShopProfileScreen />);
    await screen.findByText('محل النور');

    expect(screen.queryByText('احجز')).toBeNull();
  });
});
