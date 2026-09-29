import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { defaultBarberDraft } from '@/src/data/onboarding';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
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
  shopName: 'محل النور',
  city: 'الجزائر',
  neighborhood: 'باب الوادي',
  mapsUrl: 'https://maps.app.goo.gl/example',
  services: [{ name: 'حلاقة', priceDzd: '800', durationMinutes: '30' }],
};

const mockSaveDraft = jest.fn();
const mockPublishBarber = jest.fn();
const mockCreateBarber = jest.fn();
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
    mockCreateBarber.mockResolvedValue(undefined);
    mockSession.refreshProfile.mockResolvedValue(undefined);
    mockHookValue = {
      draft: validDraft,
      draftStep: 0,
      setDraft: jest.fn(),
      saving: false,
      hydrating: false,
      saveDraft: mockSaveDraft,
      publishBarber: mockPublishBarber,
      createBarber: mockCreateBarber,
    };
  });

  it('clamps a draft saved by the previous five-step wizard to the last setup step', async () => {
    mockHookValue = { ...mockHookValue, hydrating: true, draftStep: 0 };
    const view = await render(<BarberOnboardingScreen />);

    mockHookValue = { ...mockHookValue, hydrating: false, draftStep: 3 };
    await view.rerender(<BarberOnboardingScreen />);

    await waitFor(() => expect(screen.getByText(/2\/2/)).toBeTruthy());
  });

  it('blocks the next step when basic information is invalid', async () => {
    mockHookValue = { ...mockHookValue, draft: { ...validDraft, name: '' } };
    await render(<BarberOnboardingScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'التالي' }));

    expect(await screen.findByText('أدخل اسما ورقم هاتف جزائريا صالحا، واسم المحل إذا كنت مالكه.')).toBeTruthy();
    expect(mockSaveDraft).not.toHaveBeenCalled();
  });

  it('renders the workplace choice on the profile step', async () => {
    await render(<BarberOnboardingScreen />);

    expect(screen.getByRole('radio', { name: 'أملك محلا' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'أعمل في محل' })).not.toBeSelected();
    expect(screen.getByLabelText('اسم المحل')).toBeTruthy();
    expect(screen.getByLabelText('نبذة عن المحل (اختياري)')).toBeTruthy();
  });

  it('does not render owned-shop fields for workers', async () => {
    mockHookValue = {
      ...mockHookValue,
      draft: { ...validDraft, workplaceType: 'worker', shopName: '', shopBio: '' },
    };
    await render(<BarberOnboardingScreen />);

    expect(screen.queryByLabelText('اسم المحل')).toBeNull();
    expect(screen.queryByLabelText('نبذة عن المحل (اختياري)')).toBeNull();
  });

  it('skips location fields for workers', async () => {
    mockHookValue = {
      ...mockHookValue,
      draftStep: 1,
      draft: { ...validDraft, workplaceType: 'worker', city: '', neighborhood: '', mapsUrl: '' },
    };
    await render(<BarberOnboardingScreen />);

    expect(screen.getByText('الموقع لاحقا')).toBeTruthy();
    expect(screen.queryByLabelText('المدينة')).toBeNull();
  });

  it('shows owner location fields', async () => {
    mockHookValue = { ...mockHookValue, draftStep: 1 };
    await render(<BarberOnboardingScreen />);
    expect(screen.getByText('موقع عملك')).toBeTruthy();
    expect(screen.getByLabelText('المدينة')).toBeTruthy();
    expect(screen.getByLabelText('الحي')).toBeTruthy();
  });

  it('keeps the current step and shows a save error', async () => {
    mockSaveDraft.mockRejectedValueOnce(new Error('Network request failed'));
    await render(<BarberOnboardingScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'التالي' }));

    expect(await screen.findByText('تحقق من الاتصال بالإنترنت')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('moves back locally when a draft save is unavailable', async () => {
    mockHookValue = { ...mockHookValue, draftStep: 1 };
    mockSaveDraft.mockRejectedValueOnce(new Error('Network request failed'));
    await render(<BarberOnboardingScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'رجوع' }));

    expect(screen.getByText(/1\/2/)).toBeTruthy();
    expect(mockSaveDraft).not.toHaveBeenCalled();
  });

  it('offers account exit on every onboarding step and reports sign-out failures', async () => {
    mockHookValue = { ...mockHookValue, draftStep: 1 };
    mockSession.signOut.mockRejectedValueOnce(new Error('Network request failed'));
    await render(<BarberOnboardingScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'تغيير الحساب' }));

    expect(await screen.findByText('تحقق من الاتصال بالإنترنت')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });


  it('creates the account from the location step and lands in the workspace', async () => {
    mockHookValue = { ...mockHookValue, draftStep: 1, draft: validDraft };
    await render(<BarberOnboardingScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'إنشاء الملف' }));

    await waitFor(() => {
      expect(mockCreateBarber).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/(barber)/today');
    });
    // Publishing is a separate, later action taken from the workspace.
    expect(mockPublishBarber).not.toHaveBeenCalled();
  });

  it('does not create the account while the location step is incomplete', async () => {
    mockHookValue = {
      ...mockHookValue,
      draftStep: 1,
      draft: { ...validDraft, city: '', neighborhood: '', mapsUrl: '', latitude: '', longitude: '' },
    };
    await render(<BarberOnboardingScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'إنشاء الملف' }));

    expect(await screen.findByText('أدخل المدينة والحي ورابط Google Maps صالحا.')).toBeTruthy();
    expect(mockCreateBarber).not.toHaveBeenCalled();
  });
});
