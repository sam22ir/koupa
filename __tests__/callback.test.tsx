import { render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

const mockCompleteAuthCallback = jest.fn();
let onUrl: ((event: { url: string }) => void) | undefined;
let mockSession = {
  loading: true,
  pendingRole: null as 'customer' | 'barber' | null,
  completeAuthCallback: mockCompleteAuthCallback,
};

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useGlobalSearchParams: jest.fn(() => ({ code: 'pkce-code' })),
  useLocalSearchParams: jest.fn(() => ({ code: 'pkce-code' })),
}));

jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn(async () => null),
  addEventListener: jest.fn((_: string, handler: (event: { url: string }) => void) => {
    onUrl = handler;
    return { remove: jest.fn() };
  }),
}));

jest.mock('../src/providers/SessionProvider', () => ({
  useAppSession: () => mockSession,
}));

import CallbackScreen from '../app/callback';

describe('CallbackScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    onUrl = undefined;
    mockSession = {
      loading: true,
      pendingRole: null,
      completeAuthCallback: mockCompleteAuthCallback,
    };
    mockCompleteAuthCallback.mockResolvedValue({ kind: 'session' });
  });

  it('waits for session bootstrap before consuming a one-time callback code', async () => {
    const view = await render(<CallbackScreen />);

    await waitFor(() => expect(mockCompleteAuthCallback).not.toHaveBeenCalled());

    mockSession = {
      ...mockSession,
      loading: false,
      pendingRole: 'customer',
    };
    await view.rerender(<CallbackScreen />);

    await waitFor(() => {
      expect(mockCompleteAuthCallback).toHaveBeenCalledWith(
        'koupa://callback?code=pkce-code',
        'customer',
      );
      expect(router.replace).toHaveBeenCalledWith('/');
    });
  });

  it('ignores duplicate deep-link events for the same callback code', async () => {
    mockSession = {
      ...mockSession,
      loading: false,
      pendingRole: null,
    };
    const view = await render(<CallbackScreen />);
    await waitFor(() => expect(mockCompleteAuthCallback).toHaveBeenCalledTimes(1));

    onUrl?.({ url: 'koupa://callback?code=pkce-code' });
    await view.rerender(<CallbackScreen />);
    expect(mockCompleteAuthCallback).toHaveBeenCalledTimes(1);
  });

  it('still finishes when the session changes while the callback is in flight', async () => {
    let resolveCallback: (value: { kind: 'session' }) => void = () => undefined;
    mockCompleteAuthCallback.mockReturnValue(
      new Promise((resolve) => {
        resolveCallback = resolve;
      }),
    );
    mockSession = { ...mockSession, loading: false, pendingRole: null };
    const view = await render(<CallbackScreen />);
    await waitFor(() => expect(mockCompleteAuthCallback).toHaveBeenCalledTimes(1));

    // The exchange signs the user in, which flips loading and the pending role.
    mockSession = { ...mockSession, loading: true, pendingRole: 'customer' };
    await view.rerender(<CallbackScreen />);
    mockSession = { ...mockSession, loading: false };
    await view.rerender(<CallbackScreen />);

    resolveCallback({ kind: 'session' });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(mockCompleteAuthCallback).toHaveBeenCalledTimes(1);
  });
});
