let mockLinkingListener: ((event: { url: string }) => void) | undefined;

jest.mock('@/lib/supabase', () => ({ supabase: { auth: {}, functions: {} } }));
jest.mock('@/lib/storage', () => ({
  appStorage: { getItem: jest.fn(async () => null), setItem: jest.fn(), removeItem: jest.fn() },
}));
jest.mock('expo-auth-session', () => ({ makeRedirectUri: jest.fn(() => 'koupa://callback') }));
jest.mock('expo-constants', () => ({ appOwnership: 'standalone', executionEnvironment: 'standalone' }));
jest.mock('expo-linking', () => ({
  addEventListener: jest.fn((_event: string, listener: (event: { url: string }) => void) => {
    mockLinkingListener = listener;
    return { remove: jest.fn() };
  }),
  createURL: jest.fn(() => 'koupa://callback'),
}));
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  warmUpAsync: jest.fn(async () => undefined),
  coolDownAsync: jest.fn(async () => undefined),
  openAuthSessionAsync: jest.fn(() => new Promise(() => undefined)),
  // On Android the real module throws synchronously: there is no native dismissBrowser.
  dismissAuthSession: jest.fn(() => {
    throw new Error('WebBrowser.dismissBrowser is not available on android');
  }),
}));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

import { openGoogleAuthSession } from '@/src/services/auth';

describe('openGoogleAuthSession on Android', () => {
  it('returns the deep-linked callback even though dismissAuthSession throws', async () => {
    const pending = openGoogleAuthSession('https://example.supabase.co/auth/v1/authorize');
    await Promise.resolve();

    expect(() => mockLinkingListener?.({ url: 'koupa://callback?code=abc' })).not.toThrow();

    await expect(pending).resolves.toBe('koupa://callback?code=abc');
  });
});
