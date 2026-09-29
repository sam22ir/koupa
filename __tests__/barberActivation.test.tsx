import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { User } from '@supabase/supabase-js';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), dismissTo: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

let mockSessionState: {
  session: { user: { email: string } } | null;
  emailConfirmed: boolean;
} = { session: null, emailConfirmed: true };
const mockResend = jest.fn();

jest.mock('@/src/providers/SessionProvider', () => ({
  useAppSession: () => ({
    session: mockSessionState.session,
    emailConfirmed: mockSessionState.emailConfirmed,
    resendEmailConfirmation: (...args: unknown[]) => mockResend(...args),
  }),
}));

import { getSignupName } from '@/src/auth';
import {
  EmailConfirmationRow,
  needsEmailConfirmation,
} from '@/src/features/barber-activation/EmailConfirmationRow';
import { StarterSetup } from '@/src/features/barber-activation/StarterSetup';
import { applySchedulePreset, applyServiceExample, serviceExamples } from '@/src/data/onboarding';

describe('needsEmailConfirmation', () => {
  it.each([
    [{ hasSession: false, emailConfirmed: false }, false],
    [{ hasSession: true, emailConfirmed: true }, false],
    [{ hasSession: true, emailConfirmed: false }, true],
  ])('%j -> %s', (input, expected) => {
    expect(needsEmailConfirmation(input)).toBe(expected);
  });
});

describe('EmailConfirmationRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionState = { session: { user: { email: 'barber@example.com' } }, emailConfirmed: false };
  });

  it('shows the address and lets an unconfirmed barber resend the link', async () => {
    mockResend.mockResolvedValueOnce(undefined);
    await render(<EmailConfirmationRow />);

    expect(screen.getByText('barber@example.com')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('publish-email-resend'));

    await waitFor(() => expect(mockResend).toHaveBeenCalledWith('barber@example.com'));
    expect(await screen.findByText('تم إرسال رابط جديد.')).toBeTruthy();
  });

  it('shows an error instead of success when the resend fails', async () => {
    mockResend.mockRejectedValueOnce(new Error('network'));
    await render(<EmailConfirmationRow />);

    await fireEvent.press(screen.getByTestId('publish-email-resend'));

    await waitFor(() => expect(mockResend).toHaveBeenCalled());
    expect(screen.queryByText('تم إرسال رابط جديد.')).toBeNull();
  });

  it('renders nothing once the email is confirmed', async () => {
    mockSessionState = { session: { user: { email: 'barber@example.com' } }, emailConfirmed: true };
    await render(<EmailConfirmationRow />);

    expect(screen.queryByTestId('publish-email-row')).toBeNull();
  });
});

describe('StarterSetup', () => {
  it('renders nothing when services and hours are already saved', async () => {
    await render(
      <StarterSetup needsServices={false} needsHours={false} onAddService={jest.fn()} onApplyWeek={jest.fn()} />,
    );

    expect(screen.queryByTestId('starter-setup')).toBeNull();
  });

  it('offers only what is missing', async () => {
    await render(
      <StarterSetup needsServices={false} needsHours onAddService={jest.fn()} onApplyWeek={jest.fn()} />,
    );

    expect(screen.getByTestId('starter-week-918')).toBeTruthy();
    expect(screen.queryByTestId(`starter-service-${serviceExamples[0].name}`)).toBeNull();
  });

  it('hands the chosen week and service to the schedule screen', async () => {
    const onApplyWeek = jest.fn();
    const onAddService = jest.fn();
    await render(
      <StarterSetup needsServices needsHours onAddService={onAddService} onApplyWeek={onApplyWeek} />,
    );

    await fireEvent.press(screen.getByTestId('starter-week-921'));
    await fireEvent.press(screen.getByTestId(`starter-service-${serviceExamples[0].name}`));

    expect(onApplyWeek).toHaveBeenCalledWith('longDays');
    expect(onAddService).toHaveBeenCalledWith(serviceExamples[0]);
  });
});

describe('starter data always changes the draft, so the Save bar appears', () => {
  it('the default week differs from both presets', () => {
    const base = JSON.stringify(applySchedulePreset('default'));
    expect(JSON.stringify(applySchedulePreset('weekdays918'))).not.toBe(base);
    expect(JSON.stringify(applySchedulePreset('longDays'))).not.toBe(base);
  });

  it('a starter service replaces the blank placeholder instead of adding a second row', () => {
    const next = applyServiceExample([{ name: '', priceDzd: '', durationMinutes: '30' }], serviceExamples[0]);

    expect(next).toEqual([serviceExamples[0]]);
  });
});

describe('getSignupName', () => {
  const userWith = (meta: Record<string, unknown>) => ({ user_metadata: meta }) as unknown as User;

  it('prefers the signup name, then the Google name', () => {
    expect(getSignupName(userWith({ koupa_name: ' سمير ', full_name: 'Other' }))).toBe('سمير');
    expect(getSignupName(userWith({ full_name: 'سارة بن علي' }))).toBe('سارة بن علي');
    expect(getSignupName(userWith({ name: 'Ali' }))).toBe('Ali');
  });

  it('returns an empty string when nothing usable exists', () => {
    expect(getSignupName(null)).toBe('');
    expect(getSignupName(userWith({ koupa_name: 42 }))).toBe('');
  });
});
