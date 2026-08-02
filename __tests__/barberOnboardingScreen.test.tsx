import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { defaultBarberDraft } from '@/src/data/onboarding';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
}));

const mockSession = {
  session: { user: { id: 'barber-1', phone: '+213555000000' } },
  refreshProfile: jest.fn(),
  signOut: jest.fn(),
};

jest.mock('@/src/providers/SessionProvider', () => ({
  useAppSession: () => mockSession,
}));

const validDraft = {
  ...defaultBarberDraft,
  name: 'أمين',
  phone: '0555000000',
  city: 'الجزائر',
  neighborhood: 'باب الوادي',
  mapsUrl: 'https://maps.app.goo.gl/example',
  services: [{ name: 'حلاقة', priceDzd: '800', durationMinutes: '30' }],
};

const mockSaveDraft = jest.fn();
const mockPublishBarber = jest.fn();
let mockHookValue: Record<string, unknown>;

jest.mock('@/src/hooks/useOnboarding', () => ({
  useOnboarding: () => mockHookValue,
}));

import BarberOnboardingScreen from '../app/onboarding';

describe('BarberOnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveDraft.mockResolvedValue(undefined);
    mockPublishBarber.mockResolvedValue(undefined);
    mockSession.refreshProfile.mockResolvedValue(undefined);
    mockHookValue = {
      draft: validDraft,
      draftStep: 0,
      setDraft: jest.fn(),
      saving: false,
      hydrating: false,
      saveDraft: mockSaveDraft,
      publishBarber: mockPublishBarber,
    };
  });

  it('resumes at the asynchronously hydrated saved step', async () => {
    mockHookValue = { ...mockHookValue, hydrating: true, draftStep: 0 };
    const view = await render(<BarberOnboardingScreen />);

    mockHookValue = { ...mockHookValue, hydrating: false, draftStep: 3 };
    await view.rerender(<BarberOnboardingScreen />);

    await waitFor(() => expect(screen.getByText(/4\/5/)).toBeTruthy());
  });

  it('blocks the next step when basic information is invalid', async () => {
    mockHookValue = { ...mockHookValue, draft: { ...validDraft, name: '' } };
    await render(<BarberOnboardingScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'التالي' }));

    expect(await screen.findByText('أدخل اسما ورقم هاتف جزائريا صالحا.')).toBeTruthy();
    expect(mockSaveDraft).not.toHaveBeenCalled();
  });

  it('renders weekly hours and constrained intervals in the working-hours step', async () => {
    mockHookValue = { ...mockHookValue, draftStep: 3 };
    await render(<BarberOnboardingScreen />);

    expect(screen.getByText('ساعات العمل الأسبوعية')).toBeTruthy();
    expect(screen.getByRole('radio', { name: '30 دقيقة' })).toBeSelected();
  });

  it('keeps the current step and shows a save error', async () => {
    mockSaveDraft.mockRejectedValueOnce(new Error('Network request failed'));
    await render(<BarberOnboardingScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'التالي' }));

    expect(await screen.findByText('تحقق من الاتصال بالإنترنت')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
