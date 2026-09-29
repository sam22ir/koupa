import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import FinishAccountScreen from '@/app/(auth)/finish-account';
import { AuthShell, BackButton } from '@/src/components/ui';
import { colors, radii } from '@/src/theme';

const mockDismissTo = jest.fn();
const mockBack = jest.fn();

jest.mock('@/src/services/account', () => ({ deleteOwnAccount: jest.fn() }));

jest.mock('expo-router', () => ({
  router: {
    dismissTo: (...args: unknown[]) => mockDismissTo(...args),
    back: () => mockBack(),
    replace: jest.fn(),
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

jest.mock('@/src/providers/SessionProvider', () => ({
  useAppSession: () => ({
    legalDocuments: [
      { key: 'terms', version: '1', url: 'https://example.test/terms' },
      { key: 'privacy', version: '1', url: 'https://example.test/privacy' },
    ],
    acceptCurrentLegalDocuments: jest.fn(),
    signOut: jest.fn(),
  }),
}));

describe('app-owned back routing', () => {
  beforeEach(() => jest.clearAllMocks());

  it('dismisses to the declared fallback instead of popping arbitrary history', async () => {
    await render(<BackButton fallback="/(barber)/shop" />);

    await fireEvent.press(screen.getByRole('button', { name: 'رجوع' }));

    expect(mockDismissTo).toHaveBeenCalledWith('/(barber)/shop');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('uses the same compact square treatment for on-stage back controls', async () => {
    await render(<BackButton fallback="/(barber)/shop" tone="onPrimary" />);

    expect(screen.getByRole('button', { name: 'رجوع' })).toHaveStyle({
      width: 44,
      height: 44,
      borderRadius: radii.md,
      backgroundColor: colors.stageOverlay,
    });
  });

  it('uses logical dismissal for auth-shell back navigation', async () => {
    await render(
      <AuthShell title="عنوان" backHref="/(auth)/welcome">
        <></>
      </AuthShell>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'رجوع' }));

    expect(mockDismissTo).toHaveBeenCalledWith('/(auth)/welcome');
  });

  it('does not render an impossible Back control on the mandatory finish-account screen', async () => {
    await render(<FinishAccountScreen />);

    expect(screen.queryByRole('button', { name: 'رجوع' })).toBeNull();
    expect(screen.getByRole('button', { name: 'تغيير الحساب' })).toBeTruthy();
  });
});
